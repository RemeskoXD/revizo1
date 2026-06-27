import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Neoprávněný přístup' }, { status: 401 });
    }

    const { password } = await req.json();
    const secretPassword = process.env.BACKUP_PASSWORD;

    if (!secretPassword) {
      return NextResponse.json({ error: 'Zálohování není na serveru nakonfigurováno (chybí BACKUP_PASSWORD).' }, { status: 500 });
    }

    if (password !== secretPassword) {
      return NextResponse.json({ error: 'Nesprávné heslo pro zálohu.' }, { status: 403 });
    }

    // List of models to backup
    const models = [
      'user',
      'order',
      'property',
      'payoutRequest',
      'servicePackage',
      'pricingItem',
      'orderPricingItem',
      'revisionCategory',
      'message',
      'defectTask',
      'systemConfig',
      'stripeWebhookEvent'
    ];

    const backupData: Record<string, any> = {};

    for (const modelName of models) {
      const delegate = (prisma as any)[modelName];
      if (delegate && typeof delegate.findMany === 'function') {
        backupData[modelName] = await delegate.findMany();
      }
    }

    return NextResponse.json(backupData, { status: 200 });

  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Chyba při generování zálohy.' }, { status: 500 });
  }
}
