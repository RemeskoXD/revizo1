/**
 * Pomocné funkce pro synchronizaci počtu billable seats firmy ve Stripe subscription
 * (200 Kč × billable seats; viz docs/pricing-rules.md, sekce 4a).
 *
 * Volat při:
 *   - technik se připojí k firmě (companyId byl nastaven)
 *   - technik je odstraněn / opouští firmu (companyId byl zrušen)
 *   - role technika se změní mimo TECHNICIAN
 *
 * Funkce je idempotentní – pokud firma billing nemá aktivní, neděje se nic.
 * Pokud Stripe není nakonfigurován (např. FAKE_PAYMENT_GATEWAY=1), aktualizujeme
 * jen DB (přes počítání v API stejně dochází k přepočtu).
 */

import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe-client';
import { isStripePaymentsConfigured } from '@/lib/stripe-config';
import { ROLES } from '@/lib/constants';
import { computeBillableTechs } from '@/lib/company-pricing';

export async function syncCompanyTechBillingForCompany(companyId: string): Promise<void> {
  const company = await prisma.user.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      role: true,
      companyTechBillingActive: true,
      companyTechSubscriptionId: true,
    },
  });
  if (!company || company.role !== ROLES.COMPANY_ADMIN) return;
  if (!company.companyTechBillingActive || !company.companyTechSubscriptionId) {
    // Billing není aktivní → není co synchronizovat.
    return;
  }
  if (!isStripePaymentsConfigured()) {
    // Vývojový režim – Stripe není dostupný, kvantita se přepočítá v UI dynamicky.
    return;
  }

  const techCount = await prisma.user.count({
    where: { companyId: company.id, role: ROLES.TECHNICIAN, isDeleted: false },
  });
  const billable = Math.max(1, computeBillableTechs(techCount));

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(company.companyTechSubscriptionId);
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) return;
    if (sub.items.data[0].quantity === billable) return;

    await stripe.subscriptions.update(company.companyTechSubscriptionId, {
      items: [{ id: itemId, quantity: billable }],
      metadata: { ...sub.metadata, addonQuantity: String(billable) },
      proration_behavior: 'create_prorations',
    });
  } catch (e) {
    console.error('Failed to sync company tech billing', e);
  }
}

/**
 * Najde firmu, pod kterou daný uživatel patří (jako technik) nebo kterou má založenou,
 * a spustí sync. Vhodné pro hooky při změně role / companyId.
 */
export async function syncCompanyTechBillingForUser(
  userId: string,
  oldCompanyId: string | null,
  newCompanyId: string | null,
): Promise<void> {
  const targets = new Set<string>();
  if (oldCompanyId) targets.add(oldCompanyId);
  if (newCompanyId) targets.add(newCompanyId);
  for (const cid of targets) {
    await syncCompanyTechBillingForCompany(cid);
  }
}
