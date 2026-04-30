import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSmtpEnabled, sendMail } from '@/lib/mail';

/** GET: zda je SMTP v proměnných nastavené (bez hesel). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    configured: isSmtpEnabled(),
    host: process.env.SMTP_HOST ? '(nastaveno)' : null,
    port: process.env.SMTP_PORT || '587',
    from: process.env.SMTP_FROM ? '(nastaveno)' : null,
  });
}

/** POST: odešle testovací e-mail na zadanou adresu. Body: { "to": "vas@email.cz" } */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    if (!to || !to.includes('@')) {
      return NextResponse.json({ message: 'Neplatný parametr to' }, { status: 400 });
    }

    const result = await sendMail({
      to,
      subject: 'Revizone – test SMTP',
      text: 'Pokud tento e-mail vidíte, SMTP je v pořádku nastavené.',
      html: '<p>Pokud tento e-mail vidíte, <strong>SMTP je v pořádku</strong> nastavené.</p>',
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          message:
            'SMTP není nastavené. Doplň proměnné SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM (viz .env.example).',
          result,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Testovací e-mail odeslán', result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Chyba odeslání';
    console.error('test-smtp:', e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
