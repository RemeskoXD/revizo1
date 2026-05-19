#!/usr/bin/env node
/**
 * Migrační skript pro aktualizaci cen u stávajících Stripe subscriptions.
 *
 * KONTEXT
 *   Po sjednocení cen s diagramem (viz docs/pricing-rules.md) jsou nové ceny:
 *     SVJ            799  →  1 199 Kč / rok
 *     COMPANY_ADMIN 1199  →  4 999 Kč / rok
 *   Stávající subscribers ve Stripe ale platí starou cenu. Tento skript je
 *   "grandfather aware" – v dry-run režimu vypíše, kolik subs by se změnilo;
 *   s `--apply` provede skutečnou změnu přes Stripe API.
 *
 * POUŽITÍ
 *   # Dry run (jen výpis):
 *   node scripts/migrate-stripe-prices.mjs
 *
 *   # Skutečná migrace všech aktivních subs:
 *   node scripts/migrate-stripe-prices.mjs --apply
 *
 *   # Migrace jen jednoho plánu:
 *   node scripts/migrate-stripe-prices.mjs --apply --plan SVJ
 *
 *   # Necht stávajícím grandfather, povolit pouze nově vytvořené:
 *   # (neprovádějte žádnou migraci – stará cena zůstane platná do zrušení)
 *
 * POŽADAVKY
 *   STRIPE_SECRET_KEY v .env
 *   STRIPE_PRICE_NEW_SVJ           – nový Stripe Price ID (1 199 Kč / rok)
 *   STRIPE_PRICE_NEW_COMPANY_ADMIN – nový Stripe Price ID (4 999 Kč / rok)
 *
 * VAROVÁNÍ
 *   Skript zavolá `subscriptions.update` s `proration_behavior: 'none'`,
 *   aby zákazníci nedostali okamžitě fakturu za rozdíl. Nová cena se
 *   uplatní až při dalším obnovení.
 */

import Stripe from 'stripe';
import { config } from 'dotenv';

config();

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const PLAN_FILTER =
  args.includes('--plan') ? args[args.indexOf('--plan') + 1] : null;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY není nastaven v .env');
  process.exit(1);
}

const NEW_PRICE_IDS = {
  SVJ: process.env.STRIPE_PRICE_NEW_SVJ || '',
  COMPANY_ADMIN: process.env.STRIPE_PRICE_NEW_COMPANY_ADMIN || '',
};

const OLD_PRICE_IDS = {
  SVJ: 'price_1TRyNaLtyGxFBhS85AGMIiJl', // 799 Kč / rok (původní z subscription-pricing.ts)
  COMPANY_ADMIN: 'price_1TRyN2LtyGxFBhS8Io9Mnq3k', // 1199 Kč / rok (původní)
};

const stripe = new Stripe(STRIPE_SECRET_KEY, { typescript: true });

async function main() {
  console.log('───────────────────────────────────────────────');
  console.log(' Stripe price migration  (revizone)');
  console.log('───────────────────────────────────────────────');
  console.log(` Mode:   ${APPLY ? 'APPLY (skutečná změna)' : 'DRY RUN (jen výpis)'}`);
  console.log(` Filter: ${PLAN_FILTER || 'vše (SVJ + COMPANY_ADMIN)'}`);
  console.log('───────────────────────────────────────────────\n');

  const plans = PLAN_FILTER ? [PLAN_FILTER] : ['SVJ', 'COMPANY_ADMIN'];

  for (const plan of plans) {
    const oldId = OLD_PRICE_IDS[plan];
    const newId = NEW_PRICE_IDS[plan];
    if (!oldId) {
      console.warn(`⚠️  ${plan}: chybí mapování staré Price ID, přeskakuji.`);
      continue;
    }
    if (!newId) {
      console.warn(
        `⚠️  ${plan}: chybí ENV proměnná STRIPE_PRICE_NEW_${plan}; přeskakuji.\n` +
          '   Vytvořte novou cenu v Stripe Dashboardu a doplňte ji do .env.',
      );
      continue;
    }

    console.log(`\n=== Plán: ${plan} (${oldId} → ${newId}) ===`);

    let total = 0;
    let migrated = 0;
    let alreadyOk = 0;
    let cursor = null;

    while (true) {
      const params = {
        price: oldId,
        status: 'active',
        limit: 100,
      };
      if (cursor) params.starting_after = cursor;

      const page = await stripe.subscriptions.list(params);

      for (const sub of page.data) {
        total += 1;
        const item = sub.items.data.find((it) => it.price.id === oldId);
        if (!item) {
          continue;
        }
        if (item.price.id === newId) {
          alreadyOk += 1;
          continue;
        }

        const customer =
          typeof sub.customer === 'string'
            ? sub.customer
            : sub.customer && 'id' in sub.customer
              ? sub.customer.id
              : '?';

        console.log(
          `  • sub ${sub.id} (customer ${customer}) – migrace ${oldId} → ${newId}`,
        );

        if (APPLY) {
          try {
            await stripe.subscriptions.update(sub.id, {
              items: [{ id: item.id, price: newId }],
              proration_behavior: 'none',
              metadata: {
                ...sub.metadata,
                priceMigrationAppliedAt: new Date().toISOString(),
                priceMigrationFrom: oldId,
                priceMigrationTo: newId,
              },
            });
            migrated += 1;
          } catch (err) {
            console.error(`    ❌ Selhalo:`, err?.message || err);
          }
        }
      }

      if (!page.has_more) break;
      cursor = page.data[page.data.length - 1]?.id;
    }

    console.log(`\n  Plán ${plan}:`);
    console.log(`    Celkem subs:     ${total}`);
    console.log(`    Migrováno teď:   ${migrated}`);
    console.log(`    Už byly na nové: ${alreadyOk}`);
    if (!APPLY && total - alreadyOk > 0) {
      console.log(`    → Pro skutečnou změnu spusťte s --apply`);
    }
  }

  console.log('\n───────────────────────────────────────────────');
  console.log(' Hotovo.');
  console.log('───────────────────────────────────────────────');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
