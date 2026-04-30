/**
 * Po sjednocení DB se schématem (např. `npx prisma db push` nebo ruční SQL z `npm run db:drift`)
 * označí všechny existující migrace jako aplikované, aby `prisma migrate deploy` fungoval dál.
 *
 * Viz: https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/add-to-existing-project
 */
import { execSync } from 'node:child_process';

const migrations = [
  '20260418120000_add_user_banned_at',
  '20260418130000_add_order_is_urgent',
  '20260418140000_add_revision_auth_valid_until',
  '20260418150000_add_stripe_webhook_events',
  '20260419100000_add_user_account_status',
];

for (const name of migrations) {
  console.log(`\n→ migrate resolve --applied "${name}"`);
  execSync(`npx prisma migrate resolve --applied "${name}"`, { stdio: 'inherit' });
}

console.log('\n✓ Hotovo. Ověř: npx prisma migrate deploy  → mělo by být „No pending migrations“.\n');
