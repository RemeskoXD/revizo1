import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });
    
    if (!user || !['ADMIN', 'SUPPORT'].includes(user.role)) {
       return NextResponse.json({ error: 'Pouze pro administrátory' }, { status: 403 });
    }

    const { items } = await request.json();

    const currentItemIds = items.filter((p: any) => !p.id.startsWith('new_')).map((p: any) => p.id);
    
    // Delete anything not in the current list
    await prisma.pricingItem.deleteMany({
      where: {
        id: { notIn: currentItemIds }
      }
    });

    const updatedItems = [];

    // update or create
    for (const item of items) {
      if (item.id.startsWith('new_')) {
        const created = await prisma.pricingItem.create({
          data: {
            code: item.code,
            category: item.category,
            name: item.name,
            priceCzk: item.priceCzk,
            unit: item.unit,
          }
        });
        updatedItems.push(created);
      } else {
        const updated = await prisma.pricingItem.update({
          where: { id: item.id },
          data: {
            code: item.code,
            category: item.category,
            name: item.name,
            priceCzk: item.priceCzk,
            unit: item.unit,
          }
        });
        updatedItems.push(updated);
      }
    }

    return NextResponse.json({ success: true, items: updatedItems });
  } catch (error) {
    console.error('Save pricing items error:', error);
    return NextResponse.json({ error: 'Chyba při ukládání' }, { status: 500 });
  }
}
