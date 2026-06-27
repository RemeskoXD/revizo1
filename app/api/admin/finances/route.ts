import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe-client';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get('month'); // e.g. "2026-06"
    
    let startDate: Date;
    let endDate: Date;
    
    if (monthStr) {
      startDate = new Date(`${monthStr}-01T00:00:00.000Z`);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Revision earnings from DB
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        price: true,
        completedAt: true,
        technicianId: true,
        customer: {
          select: { referredByRealtorId: true }
        }
      },
    });

    const payoutRequests = await prisma.payoutRequest.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // 2. Stripe API for Subscriptions and Total Flow
    const stripe = getStripe();
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    let totalFlow = 0;
    let subscriptionEarnings = 0;
    
    // Group daily data
    const dailyData: Record<string, { date: string, revisions: number, subscriptions: number, flow: number }> = {};
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = { date: dateStr, revisions: 0, subscriptions: 0, flow: 0 };
    }

    // Assign DB revisions
    let totalRevisionsEarnings = 0;
    
    for (const order of completedOrders) {
      if (!order.price) continue;
      
      let feePercentage = 10;
      if (order.customer && order.customer.referredByRealtorId === order.technicianId) {
        feePercentage = 5;
      }
      const platformFee = order.price * (feePercentage / 100);
      
      const dateStr = order.completedAt!.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].revisions += platformFee;
        totalRevisionsEarnings += platformFee;
      }
    }

    // Try fetching from Stripe if valid keys
    try {
      while (hasMore) {
        const charges = (await stripe.charges.list({
          created: {
            gte: Math.floor(startDate.getTime() / 1000),
            lte: Math.floor(endDate.getTime() / 1000),
          },
          limit: 100,
          starting_after: startingAfter,
        })) as any;

        for (const charge of charges.data) {
          if (charge.paid && !charge.refunded) {
            const amount = charge.amount / 100; // Assuming CZK or similar where 100 = 1 unit? Wait, CZK is zero-decimal in some systems? No, Stripe uses smallest currency unit (haléře). CZK amount is in haléře. So divide by 100.
            const dateStr = new Date(charge.created * 1000).toISOString().split('T')[0];
            
            if (dailyData[dateStr]) {
              dailyData[dateStr].flow += amount;
              totalFlow += amount;
              
              // Guess if it's a subscription by invoice
              if (charge.invoice) {
                dailyData[dateStr].subscriptions += amount;
                subscriptionEarnings += amount;
              }
            }
          }
        }

        hasMore = charges.has_more;
        if (charges.data.length > 0) {
          startingAfter = charges.data[charges.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }
    } catch (e) {
      console.error('Stripe API error in finances:', e);
      // Fallback if Stripe is not configured or errors out
    }

    const chartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    const totalEarnings = totalRevisionsEarnings + subscriptionEarnings;

    return NextResponse.json({
      totalFlow,
      subscriptionEarnings,
      revisionsEarnings: totalRevisionsEarnings,
      totalEarnings,
      chartData
    });
  } catch (error) {
    console.error('Finances error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
