import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminPricingItemsClient from './AdminPricingItemsClient';

export const metadata = {
  title: 'Revizone - Administrace Ceníku (Položky fakturace)',
};

export default async function AdminPricingItemsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const initialItems = await prisma.pricingItem.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ],
  });

  return (
    <div className="p-6 h-full overflow-y-auto w-full">
      <AdminPricingItemsClient initialItems={initialItems} />
    </div>
  );
}
