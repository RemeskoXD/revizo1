import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { applyLicenseAfterPayment } from '@/lib/stripe-license';
import { getStripe } from '@/lib/stripe-client';
import { getStripeLicensePeriodMonths } from '@/lib/stripe-config';
import { sendMail } from '@/lib/mail';
import {
  paymentSuccessEmail,
  objectAddonActivatedEmail,
  objectAddonRevokedEmail,
  subscriptionRenewedEmail,
  subscriptionPaymentFailedEmail,
} from '@/lib/email-templates';
import { getObjectAddons } from '@/lib/pricing-db';
import { notifyAddonActivated, notifyAddonRevoked } from '@/lib/notifications';
import { tryCreateReferralReward } from '@/lib/referral';

function invoiceCustomerId(inv: Stripe.Invoice): string | null {
  const c = inv.customer;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'id' in c && !c.deleted) return c.id;
  return null;
}

type AddonKind = 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS' | 'COMPANY_TECH_SEATS';

function parseAddonMetadata(
  meta: Stripe.Metadata | null | undefined,
): { userId: string; addonKind: AddonKind; quantity: number } | null {
  if (!meta) return null;
  const userId = typeof meta.userId === 'string' ? meta.userId.trim() : '';
  const kindRaw = typeof meta.addonKind === 'string' ? meta.addonKind.trim() : '';
  if (
    !userId ||
    (kindRaw !== 'CUSTOMER_EXTRA_OBJECT' &&
      kindRaw !== 'PACKAGE_10_OBJECTS' &&
      kindRaw !== 'COMPANY_TECH_SEATS')
  ) {
    return null;
  }
  const qtyRaw = Number(meta.addonQuantity);
  const quantity = Number.isFinite(qtyRaw) && qtyRaw >= 1 ? Math.floor(qtyRaw) : 1;
  return { userId, addonKind: kindRaw, quantity };
}

/**
 * Vrátí aktivní množství u subscription itemu (pro CUSTOMER_EXTRA_OBJECT).
 * Pokud Stripe pošle změnu množství, vezmeme prvního itemu.
 */
function firstItemQuantity(sub: Stripe.Subscription): number {
  const q = sub.items?.data?.[0]?.quantity;
  return typeof q === 'number' && q >= 0 ? q : 0;
}

async function applyAddonActivation(
  userId: string,
  addonKind: AddonKind,
  quantity: number,
  subscriptionId?: string,
): Promise<void> {
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      emailNotifications: true,
      objectPackagePaid: true,
      objectLimitExtraPaid: true,
      companyTechBillingActive: true,
    },
  });
  if (!before) return;

  let changed = false;
  if (addonKind === 'PACKAGE_10_OBJECTS') {
    if (!before.objectPackagePaid) changed = true;
    await prisma.user.update({
      where: { id: userId },
      data: { objectPackagePaid: true },
    });
  } else if (addonKind === 'CUSTOMER_EXTRA_OBJECT') {
    const newQty = Math.max(0, Math.floor(quantity));
    if (before.objectLimitExtraPaid !== newQty) changed = true;
    await prisma.user.update({
      where: { id: userId },
      data: { objectLimitExtraPaid: newQty },
    });
  } else if (addonKind === 'COMPANY_TECH_SEATS') {
    if (!before.companyTechBillingActive) changed = true;
    await prisma.user.update({
      where: { id: userId },
      data: {
        companyTechBillingActive: true,
        ...(subscriptionId ? { companyTechSubscriptionId: subscriptionId } : {}),
      },
    });
  }

  // E-mail + in-app notifikace jen při skutečné změně (zabrání spamu při invoice renewal).
  if (changed) {
    if (
      before.email &&
      before.emailNotifications &&
      (addonKind === 'CUSTOMER_EXTRA_OBJECT' || addonKind === 'PACKAGE_10_OBJECTS')
    ) {
      const addons = await getObjectAddons();
      const tpl = objectAddonActivatedEmail({
        userName: before.name,
        kind: addonKind,
        quantity,
        pricePerYearCzk:
          addonKind === 'PACKAGE_10_OBJECTS'
            ? addons.package10Objects.yearlyPriceCzk
            : addons.customerExtraObject.yearlyPriceCzk,
      });
      sendMail({ to: before.email, ...tpl }).catch(console.error);
    }
    if (addonKind === 'CUSTOMER_EXTRA_OBJECT' || addonKind === 'PACKAGE_10_OBJECTS') {
      notifyAddonActivated({ userId, kind: addonKind, quantity }).catch(console.error);
    }
  }
}

async function applyAddonRevocation(userId: string, addonKind: AddonKind): Promise<void> {
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      emailNotifications: true,
      objectPackagePaid: true,
      objectLimitExtraPaid: true,
      companyTechBillingActive: true,
    },
  });
  if (!before) return;

  let changed = false;
  if (addonKind === 'PACKAGE_10_OBJECTS') {
    if (before.objectPackagePaid) changed = true;
    await prisma.user.update({
      where: { id: userId },
      data: { objectPackagePaid: false },
    });
  } else if (addonKind === 'CUSTOMER_EXTRA_OBJECT') {
    if ((before.objectLimitExtraPaid ?? 0) > 0) changed = true;
    await prisma.user.update({
      where: { id: userId },
      data: { objectLimitExtraPaid: 0 },
    });
  } else if (addonKind === 'COMPANY_TECH_SEATS') {
    if (before.companyTechBillingActive) changed = true;
    await prisma.user.update({
      where: { id: userId },
      data: { companyTechBillingActive: false, companyTechSubscriptionId: null },
    });
  }

  if (changed) {
    if (
      before.email &&
      before.emailNotifications &&
      (addonKind === 'CUSTOMER_EXTRA_OBJECT' || addonKind === 'PACKAGE_10_OBJECTS')
    ) {
      const tpl = objectAddonRevokedEmail({
        userName: before.name,
        kind: addonKind,
      });
      sendMail({ to: before.email, ...tpl }).catch(console.error);
    }
    if (addonKind === 'CUSTOMER_EXTRA_OBJECT' || addonKind === 'PACKAGE_10_OBJECTS') {
      notifyAddonRevoked({ userId, kind: addonKind }).catch(console.error);
    }
  }
}

/**
 * Zpracuje Stripe event (voláno až po kontrole duplicity evt_).
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const sess = event.data.object as Stripe.Checkout.Session;
      
      // Credit Topup
      if (sess.metadata?.type === 'CREDIT_TOPUP' && sess.payment_status === 'paid') {
        const userId = sess.metadata.userId;
        const amountCzk = Number(sess.metadata.amountCzk);
        if (userId && amountCzk > 0) {
          await prisma.user.update({
            where: { id: userId },
            data: { creditBalance: { increment: amountCzk } }
          });
        }
        return;
      }

      // Subscription Customer Update
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

      // Core subscription activation (if it's a subscription and not an addon)
      const isAddonSession = !!parseAddonMetadata(sess.metadata);
      const isRealtyFeeSession = sess.metadata?.purpose === 'REALTY_TRANSFER_FEE';
      if (sess.mode === 'subscription' && !isAddonSession && !isRealtyFeeSession && userId) {
        const periodMonths = getStripeLicensePeriodMonths();
        // Fallback k sess.created jako k platné chvíli (užitečné např. u trial subscription)
        const paidAt = new Date(sess.created * 1000);
        await applyLicenseAfterPayment({
          userId: userId,
          paidAt,
          periodMonths,
          stripeCustomerId: customerId,
        });
      }

      // Object-limit addon activation (viz docs/pricing-rules.md)
      const addon = parseAddonMetadata(sess.metadata);
      if (addon && sess.payment_status === 'paid') {
        const subRaw = sess.subscription;
        const subId =
          typeof subRaw === 'string'
            ? subRaw
            : subRaw && typeof subRaw === 'object' && 'id' in subRaw
              ? subRaw.id
              : undefined;
        await applyAddonActivation(addon.userId, addon.addonKind, addon.quantity, subId);
      }

      // Realty transfer fee (200 Kč)
      if (sess.metadata?.purpose === 'REALTY_TRANSFER_FEE' && sess.payment_status === 'paid') {
        const transferFeeId = sess.metadata?.transferFeeId;
        const invId =
          typeof sess.invoice === 'string'
            ? sess.invoice
            : sess.invoice && typeof sess.invoice === 'object' && 'id' in sess.invoice
              ? sess.invoice.id
              : null;
        if (transferFeeId) {
          await prisma.realtorTransferFee
            .update({
              where: { id: transferFeeId },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                stripeInvoiceId: invId,
              },
            })
            .catch((e) => console.error('Failed to mark transfer fee PAID:', e));
        }
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
      let userId = sub.metadata?.userId;
      
      const custId = invoiceCustomerId(inv);

      if (!userId && custId) {
        const u = await prisma.user.findFirst({
          where: { stripeCustomerId: custId },
          select: { id: true }
        });
        if (u) userId = u.id;
      }

      if (!userId) return;

      // Faktura pro doplňkové předplatné neprodlužuje hlavní licenci, jen udržuje doplněk aktivní.
      const addon = parseAddonMetadata(sub.metadata);
      if (addon) {
        const qty = addon.addonKind === 'CUSTOMER_EXTRA_OBJECT'
          ? firstItemQuantity(sub) || addon.quantity
          : addon.quantity;
        await applyAddonActivation(addon.userId, addon.addonKind, qty);
        return;
      }

      const periodMonths = getStripeLicensePeriodMonths();
      const paidUnix = inv.status_transitions?.paid_at ?? inv.created;
      const paidAt = new Date(paidUnix * 1000);
      const cust = invoiceCustomerId(inv);

      const { licenseValidUntil } = await applyLicenseAfterPayment({
        userId,
        paidAt,
        periodMonths,
        stripeCustomerId: cust,
      });

      const updatedUser = await prisma.user.findUnique({ where: { id: userId } });

      if (updatedUser && updatedUser.email && updatedUser.emailNotifications) {
        const tpl = subscriptionRenewedEmail({
          userName: updatedUser.name,
          periodMonths,
          validUntil: licenseValidUntil || new Date()
        });
        sendMail({ to: updatedUser.email, ...tpl }).catch(console.error);
      }

      // Referral program – po první platbě CUSTOMER vytvoř odměnu makléři (idempotentní).
      tryCreateReferralReward(userId).catch((e) => console.error('Referral reward failed:', e));
      return;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const custId = invoiceCustomerId(inv);
      if (custId) {
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: custId } });
        if (user && user.email && user.emailNotifications) {
          const tpl = subscriptionPaymentFailedEmail({
            userName: user.name,
            invoiceUrl: inv.hosted_invoice_url || null
          });
          sendMail({ to: user.email, ...tpl }).catch(console.error);
        }
      }
      return;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const addon = parseAddonMetadata(sub.metadata);
      if (!addon) return;

      // Zákazník mohl změnit počet dalších objektů (quantity) → promítnout.
      if (addon.addonKind === 'CUSTOMER_EXTRA_OBJECT') {
        const qty = firstItemQuantity(sub);
        if (sub.status === 'active' || sub.status === 'trialing') {
          await applyAddonActivation(addon.userId, addon.addonKind, qty);
        }
      }
      // Pokud subscription přejde do canceled / unpaid → revoke.
      if (
        sub.status === 'canceled' ||
        sub.status === 'unpaid' ||
        sub.status === 'incomplete_expired'
      ) {
        await applyAddonRevocation(addon.userId, addon.addonKind);
      }
      return;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const addon = parseAddonMetadata(sub.metadata);
      if (!addon) return;
      await applyAddonRevocation(addon.userId, addon.addonKind);
      return;
    }

    default:
      return;
  }
}
