import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { PayClient } from './PayClient';

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const order = await prisma.order.findUnique({
    where: { readableId: id },
    include: { customer: true, technician: true }
  });

  if (!order) return <div className="p-8 text-center text-white">Objednávka nebyla nalezena.</div>;

  const plainOrder = JSON.parse(JSON.stringify({
    ...order,
    customer: undefined,
    technician: undefined
  }));

  return <PayClient order={plainOrder} />;
}
