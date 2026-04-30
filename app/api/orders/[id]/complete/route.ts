import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyOrderCompleted, notifyDefectCreated, sendOrderStatusEmail } from '@/lib/notifications';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { assertRevisionAuthValid } from '@/lib/revision-auth';

const REPORT_BODY_MAX = 8_500_000;
const RESULTS = new Set(['PASS', 'FAIL', 'PASS_WITH_NOTES']);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const authDenied = await assertRevisionAuthValid(session.user.id);
    if (authDenied) return authDenied;

    const rl = rateLimit(`order-complete:${session.user.id}`, 35, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho dokončení. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { id } = await params;
    const body = await readJsonBody<{
      reportFile?: string;
      revisionResult?: string;
      revisionNotes?: string | null;
      nextRevisionDate?: string | null;
    }>(req, REPORT_BODY_MAX);

    let { reportFile, revisionResult, revisionNotes, nextRevisionDate } = body;
    revisionResult = revisionResult && RESULTS.has(revisionResult) ? revisionResult : 'PASS';
    revisionNotes = revisionNotes != null ? String(revisionNotes).slice(0, 8000) : null;

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
      include: { revisionCategory: true },
    });

    if (!order) {
      return NextResponse.json({ message: 'Objednávka nenalezena' }, { status: 404 });
    }

    if (order.technicianId !== session.user.id && order.companyId !== session.user.id) {
      return NextResponse.json({ message: 'Zakázka vám není přiřazena' }, { status: 403 });
    }

    if (order.status === 'COMPLETED') {
      return NextResponse.json({ message: 'Zakázka je již dokončena' }, { status: 400 });
    }

    if (!reportFile || typeof reportFile !== 'string') {
      return NextResponse.json({ message: 'Revizní zpráva (PDF) je povinná' }, { status: 400 });
    }

    let autoNextRevision: Date | null = null;
    if (nextRevisionDate) {
      autoNextRevision = new Date(nextRevisionDate);
    } else if (order.revisionCategory?.intervalMonths) {
      autoNextRevision = new Date();
      autoNextRevision.setMonth(autoNextRevision.getMonth() + order.revisionCategory.intervalMonths);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        reportFile,
        revisionResult: revisionResult || 'PASS',
        revisionNotes: revisionNotes || null,
        nextRevisionDate: autoNextRevision,
        completedAt: new Date(),
      },
    });

    // Auto-create defect tasks if revision has issues
    if (revisionResult === 'FAIL' || revisionResult === 'PASS_WITH_NOTES') {
      const taskTitle = revisionResult === 'FAIL' 
        ? `⚠️ Revize nevyhovuje – ${order.serviceType}` 
        : `🔧 Revize s výhradami – ${order.serviceType}`;
      const taskDesc = revisionNotes || 'Technik zjistil závady. Podívejte se na revizní zprávu a zajistěte nápravu.';
      
      await prisma.defectTask.create({
        data: {
          orderId: order.id,
          userId: order.customerId,
          title: taskTitle,
          description: taskDesc,
          priority: revisionResult === 'FAIL' ? 'HIGH' : 'MEDIUM',
        },
      });
    }

    await notifyOrderCompleted(order.id, order.readableId, order.customerId, revisionResult || 'PASS');
    sendOrderStatusEmail(order.id, 'COMPLETED').catch(console.error);
    
    if (revisionResult === 'FAIL' || revisionResult === 'PASS_WITH_NOTES') {
      await notifyDefectCreated(order.customerId, order.readableId);
    }

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Revizní zpráva / data jsou příliš velká' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2000'
    ) {
      const meta = error.meta as { column_name?: string } | undefined;
      const col = meta?.column_name;
      if (col === 'reportFile') {
        return NextResponse.json(
          {
            message:
              'Revizní zpráva je příliš velká pro sloupec v databázi. Administrátor musí v MySQL nastavit `Order.reportFile` na LONGTEXT, např.: ALTER TABLE `Order` MODIFY COLUMN `reportFile` LONGTEXT NULL; Poté obnovte stránku a zkuste znovu.',
          },
          { status: 413 }
        );
      }
      return NextResponse.json(
        {
          message: `Hodnota je příliš dlouhá pro sloupec${col ? ` (${col})` : ''}. Kontaktujte administrátora databáze.`,
        },
        { status: 413 }
      );
    }
    console.error('Complete order error:', error);
    return NextResponse.json({ message: 'Interní chyba serveru' }, { status: 500 });
  }
}
