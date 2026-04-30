/**
 * Next.js `output: "standalone"` nevkládá do `.next/standalone` složky `.next/static` ani `public`.
 * Bez nich prohlížeč dostává 404 na /_next/static/chunks/* a MIME text/plain.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');
const standaloneNext = join(standalone, '.next');

if (!existsSync(standalone)) {
  console.error('Chybí .next/standalone — spusť nejdřív `next build` (output: standalone).');
  process.exit(1);
}

mkdirSync(standaloneNext, { recursive: true });

const staticSrc = join(root, '.next', 'static');
const staticDest = join(standaloneNext, 'static');
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log('OK: zkopírováno .next/static → .next/standalone/.next/static');
} else {
  console.warn('Varování: neexistuje .next/static');
}

const publicSrc = join(root, 'public');
const publicDest = join(standalone, 'public');
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log('OK: zkopírováno public → .next/standalone/public');
}
