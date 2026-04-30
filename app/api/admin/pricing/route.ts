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
    
    if (!user || !['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(user.role)) {
       return NextResponse.json({ error: 'Pouze pro administrátory' }, { status: 403 });
    }

    const body = await request.json();
    const { subscriptions, services, urgentSurcharge } = body;

    if (subscriptions) {
      await prisma.systemConfig.upsert({
        where: { key: 'pricing_subscriptions' },
        update: { value: JSON.stringify(subscriptions) },
        create: { key: 'pricing_subscriptions', value: JSON.stringify(subscriptions), label: 'Ceník předplatného' },
      });
    }

    if (services) {
      await prisma.systemConfig.upsert({
        where: { key: 'pricing_services' },
        update: { value: JSON.stringify(services) },
        create: { key: 'pricing_services', value: JSON.stringify(services), label: 'Ceník revizí' },
      });
    }

    if (urgentSurcharge !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'pricing_urgent_surcharge' },
        update: { value: String(urgentSurcharge) },
        create: { key: 'pricing_urgent_surcharge', value: String(urgentSurcharge), label: 'Příplatek za urgentní revizi' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save pricing error:', error);
    return NextResponse.json({ error: 'Chyba při ukládání' }, { status: 500 });
  }
}
