/**
 * Spustí `server.js` z `.next/standalone` se správným cwd (očekává zkopírované static/public).
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dir = join(root, '.next', 'standalone');

if (!existsSync(join(dir, 'server.js'))) {
  console.error('Chybí .next/standalone/server.js — spusť `npm run build`.');
  process.exit(1);
}

// Spustíme migrace pokud máme DATABASE_URL
if (process.env.DATABASE_URL) {
  console.log('Spouštím prisma migrate deploy...');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: root, // Spouštíme z rootu, kde je package.json a node_modules
      stdio: 'inherit',
      env: process.env,
    });
    console.log('OK: Migrace úspěšně dokončeny nebo nebyly žádné nové.');
  } catch (error) {
    console.error('Chyba při spouštění migrací:', error);
  }
}

// Docker/Coolify nastaví HOSTNAME na ID kontejneru → Next naslouchá jen na něm a proxy dostane 502.
// Vždy přepíšeme na 0.0.0.0 jen pro child proces.
const childEnv = {
  ...process.env,
  HOSTNAME: '0.0.0.0',
  PORT: process.env.PORT || '3000',
};

const child = spawn(process.execPath, ['server.js'], {
  cwd: dir,
  stdio: 'inherit',
  env: childEnv,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
