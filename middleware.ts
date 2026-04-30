import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getNextAuthJwtSecret, isProductionAuthMisconfigured } from '@/lib/jwt-secret';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isPublicPathname } from '@/lib/public-routes';

/** POST z NextAuth při přihlášení heslem (Credentials provider). */
function isCredentialsSignInPost(request: NextRequest): boolean {
  if (request.method !== 'POST') return false;
  const p = request.nextUrl.pathname;
  return (
    p === '/api/auth/callback/credentials' ||
    p.startsWith('/api/auth/callback/credentials/') ||
    p === '/api/auth/signin/credentials' ||
    p.startsWith('/api/auth/signin/credentials/')
  );
}

const PROTECTED_ROUTES: Record<string, string[]> = {
  '/admin': ['ADMIN', 'SUPPORT', 'CONTRACTOR'],
  '/company': ['COMPANY_ADMIN'],
  '/technician': ['TECHNICIAN'],
  '/realty': ['REALTY'],
  '/svj': ['SVJ'],
  '/dashboard': ['CUSTOMER', 'TECHNICIAN', 'COMPANY_ADMIN', 'REALTY', 'SVJ', 'ADMIN', 'SUPPORT', 'CONTRACTOR'],
};

/** Only real static assets — never use `pathname.includes('.')` (that bypassed auth for arbitrary URLs). */
const STATIC_FILE = /\.(?:ico|png|jpg|jpeg|gif|webp|avif|svg|css|js|map|txt|xml|woff2?|ttf|eot|webmanifest)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow framework assets (needed even when returning 503 for misconfiguration).
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || STATIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  if (isProductionAuthMisconfigured()) {
    const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>503 – Konfigurace serveru</title>
<style>
body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:2rem;line-height:1.5}
.box{max-width:36rem;margin:3rem auto;padding:2rem;border:1px solid #f59e0b55;background:#1a1a1a;border-radius:12px}
h1{color:#fbbf24;font-size:1.25rem;margin:0 0 1rem}
code{background:#0006;padding:.15rem .4rem;border-radius:4px;font-size:.9em}
p{color:#ccc;font-size:.95rem}
</style>
</head>
<body>
<div class="box">
<h1>Služba dočasně nedostupná (503)</h1>
<p>V produkci musí být nastavena proměnná <code>NEXTAUTH_SECRET</code> na <strong>alespoň 24 znaků</strong> (doporučeno 32+ náhodných znaků). Bez ní NextAuth nefunguje a aplikace odmítá požadavky.</p>
<p>Zkontrolujte prostředí (Coolify / hosting) a po úpravě znovu nasaďte nebo restartujte kontejner.</p>
</div>
</body>
</html>`;
    return new NextResponse(html, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (isCredentialsSignInPost(request)) {
    const ip = getClientIp(request);
    const limited = rateLimit(`auth-cred:${ip}`, 25, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Příliš mnoho pokusů o přihlášení. Zkuste to později.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSec) },
        }
      );
    }
  }

  if (isPublicPathname(pathname) || pathname === '/') {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: getNextAuthJwtSecret() });

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as string;

  for (const [routePrefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(userRole)) {
        const homeMap: Record<string, string> = {
          'CUSTOMER': '/dashboard',
          'TECHNICIAN': '/technician',
          'COMPANY_ADMIN': '/company',
          'REALTY': '/realty',
          'SVJ': '/svj',
          'ADMIN': '/admin',
          'SUPPORT': '/admin',
          'CONTRACTOR': '/admin',
        };
        const redirectTo = homeMap[userRole] || '/dashboard';
        if (redirectTo !== pathname) {
          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
