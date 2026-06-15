import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const body = await req.json();
    const items = body.items as { pricingItemId: string, quantity: number }[];

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { readableId: id },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Only allow modification if status is PENDING or IN_PROGRESS, or if Admin
    if (order.status === 'COMPLETED' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Order is already completed' }, { status: 400 });
    }

    // Replace all existing pricing items
    await prisma.orderPricingItem.deleteMany({
      where: { orderId: order.id }
    });

    let totalOrderPrice = 0;

    for (const item of items) {
      const pricingItem = await prisma.pricingItem.findUnique({ where: { id: item.pricingItemId } });
      if (pricingItem) {
        const itemTotal = pricingItem.priceCzk * item.quantity;
        totalOrderPrice += itemTotal;

        await prisma.orderPricingItem.create({
          data: {
            orderId: order.id,
            pricingItemId: pricingItem.id,
            quantity: item.quantity,
            unitPriceCzk: pricingItem.priceCzk,
            totalPriceCzk: itemTotal
          }
        });
      }
    }

    // Update order total price
    await prisma.order.update({
      where: { id: order.id },
      data: { price: totalOrderPrice }
    });

    return NextResponse.json({ success: true, totalOrderPrice });
  } catch (error) {
    console.error('Error saving pricing items:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
