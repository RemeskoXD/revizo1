import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const COL = 'requiresSubscriptionCheckout';

/** True když MySQL/Prisma hlásí neexistující sloupec (migrace ještě neproběhla). */
export function isMissingRequiresSubscriptionCheckoutColumn(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2022') {
    const meta = err.meta as { column?: string } | undefined;
    if (meta?.column?.includes(COL)) return true;
    return err.message.includes(COL);
  }
  const m = err instanceof Error ? err.message : String(err);
  return m.includes(COL) && (m.includes('Unknown column') || m.includes('does not exist'));
}

type UserCreateParams = Parameters<typeof prisma.user.create>[0];

export async function createUserWithSubscriptionColumnFallback(args: UserCreateParams) {
  try {
    return await prisma.user.create(args);
  } catch (e) {
    if (!isMissingRequiresSubscriptionCheckoutColumn(e)) throw e;
    const data = { ...(args.data as Record<string, unknown>) };
    delete data[COL];
    return await prisma.user.create({
      ...args,
      data: data as UserCreateParams['data'],
    });
  }
}

type UserUpdateParams = Parameters<typeof prisma.user.update>[0];

export async function updateUserWithSubscriptionColumnFallback(args: UserUpdateParams) {
  try {
    return await prisma.user.update(args);
  } catch (e) {
    if (!isMissingRequiresSubscriptionCheckoutColumn(e)) throw e;
    const data = { ...(args.data as Record<string, unknown>) };
    delete data[COL];
    return await prisma.user.update({
      ...args,
      data: data as UserUpdateParams['data'],
    });
  }
}

/** Řádek uživatele pro NextAuth session – bez pádu, pokud v DB ještě není sloupec předplatného. */
export async function findUserForAuthSession(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        bannedAt: true,
        revisionAuthValidUntil: true,
        requiresSubscriptionCheckout: true,
      },
    });
  } catch (e) {
    if (!isMissingRequiresSubscriptionCheckoutColumn(e)) throw e;
    const r = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        bannedAt: true,
        revisionAuthValidUntil: true,
      },
    });
    if (!r) return null;
    return { ...r, requiresSubscriptionCheckout: false as boolean | null };
  }
}

export async function findUserForPlatbaTestOnboarding(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { requiresSubscriptionCheckout: true, role: true },
    });
  } catch (e) {
    if (!isMissingRequiresSubscriptionCheckoutColumn(e)) throw e;
    const r = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!r) return null;
    return { role: r.role, requiresSubscriptionCheckout: false as boolean | null };
  }
}

export async function findUserForCompleteFakeOnboarding(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { licenseValidUntil: true, requiresSubscriptionCheckout: true },
    });
  } catch (e) {
    if (!isMissingRequiresSubscriptionCheckoutColumn(e)) throw e;
    const r = await prisma.user.findUnique({
      where: { id: userId },
      select: { licenseValidUntil: true },
    });
    if (!r) return null;
    return { ...r, requiresSubscriptionCheckout: false as boolean | null };
  }
}

export async function userRequiresSubscriptionOnboarding(userId: string): Promise<boolean> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { requiresSubscriptionCheckout: true },
    });
    return row?.requiresSubscriptionCheckout === true;
  } catch (e) {
    if (!isMissingRequiresSubscriptionCheckoutColumn(e)) throw e;
    return false;
  }
}
