import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { applyLicenseAfterPayment } from '@/lib/stripe-license';
import { getStripe } from '@/lib/stripe-client';
import { getStripeLicensePeriodMonths } from '@/lib/stripe-config';

function invoiceCustomerId(inv: Stripe.Invoice): string | null {
  const c = inv.customer;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'id' in c && !c.deleted) return c.id;
  return null;
}

/**
 * Zpracuje Stripe event (voláno až po kontrole duplicity evt_).
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const sess = event.data.object as Stripe.Checkout.Session;
      const userId = sess.metadata?.userId || sess.client_reference_id;
      const customerRaw = sess.customer;
      const customerId =
        typeof customerRaw === 'string'
          ? customerRaw
          : customerRaw && typeof customerRaw === 'object' && 'id' in customerRaw
            ? customerRaw.id
            : null;
      if (userId && customerId) {
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }
      return;
    }

    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.status !== 'paid') return;

      const subRaw = inv.subscription;
      if (!subRaw) return;
      const subId = typeof subRaw === 'string' ? subRaw : subRaw.id;

      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = sub.metadata?.userId;
      if (!userId) return;

      const periodMonths = getStripeLicensePeriodMonths();
      const paidUnix = inv.status_transitions?.paid_at ?? inv.created;
      const paidAt = new Date(paidUnix * 1000);
      const cust = invoiceCustomerId(inv);

      await applyLicenseAfterPayment({
        userId,
        paidAt,
        periodMonths,
        stripeCustomerId: cust,
      });
      return;
    }

    default:
      return;
  }
}
