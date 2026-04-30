import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { isCheckoutAvailable, isFakePaymentGatewayEnabled } from '@/lib/stripe-config';
import SettingsDbError from '@/components/settings/SettingsDbError';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
  } catch (e) {
    console.error('SettingsPage: prisma.user.findUnique', e);
    return (
      <SettingsDbError
        message={e instanceof Error ? e.message : String(e)}
      />
    );
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <SettingsClient
      user={user}
      stripeConfigured={isCheckoutAvailable()}
      stripeFakeMode={isFakePaymentGatewayEnabled()}
    />
  );
}
