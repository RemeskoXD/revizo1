import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyOrderCompleted, notifyDefectCreated, sendOrderStatusEmail } from '@/lib/notifications';
import { sendMail } from '@/lib/mail';
import { orderCompletedEmail } from '@/lib/email-templates';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { assertRevisionAuthValid } from '@/lib/revision-auth';

const REPORT_BODY_MAX = 8_500_000;
const RESULTS = new Set(['PASS', 'FAIL', 'PASS_WITH_NOTES']);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session: any = null;
  let feeAmount: number | undefined;

  try {
    session = await getServerSession(authOptions);
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
      invoiceFile?: string | null;
      invoiceDueDate?: string | null;
      price?: number;
      revisionResult?: string;
      revisionNotes?: string | null;
      nextRevisionDate?: string | null;
    }>(req, REPORT_BODY_MAX);

    let { reportFile, invoiceFile, invoiceDueDate, price, revisionResult, revisionNotes, nextRevisionDate } = body;
    revisionResult = revisionResult && RESULTS.has(revisionResult) ? revisionResult : 'PASS';
    revisionNotes = revisionNotes != null ? String(revisionNotes).slice(0, 8000) : null;

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
      include: { revisionCategory: true, customer: true },
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
    
    let finalPrice = order.price || 0;
    if (price && typeof price === 'number' && price > 0) {
      finalPrice = price;
    }
    
    if (invoiceFile && finalPrice <= 0) {
      return NextResponse.json({ message: 'Při nahrání faktury je nutné mít nastavenou nebo zadat cenu zakázky větší než 0.' }, { status: 400 });
    }

    if (invoiceDueDate) {
      const d = new Date(invoiceDueDate);
      const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 den
      const maxDate = new Date(Date.now() + 65 * 24 * 60 * 60 * 1000); // +65 dnů
      if (d < minDate || d > maxDate) {
        return NextResponse.json({ message: 'Splatnost faktury musí být v rozmezí 1 až 65 dnů.' }, { status: 400 });
      }
    } else if (invoiceFile) {
      invoiceDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    }

    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!currentUser) {
      return NextResponse.json({ message: 'Uživatel nenalezen' }, { status: 404 });
    }

    let feePercentage = 10;
    if (order.customer && order.customer.referredByRealtorId === session.user.id) {
      feePercentage = 5;
    }
    feeAmount = finalPrice * (feePercentage / 100);

    if (currentUser.creditBalance < feeAmount) {
      return NextResponse.json({ message: `Nedostatek kreditu pro dokončení. Chybí vám ${(feeAmount - currentUser.creditBalance).toLocaleString('cs-CZ')} Kč. Dobijte si kredit v nastavení.` }, { status: 402 });
    }

    let autoNextRevision: Date | null = null;
    if (nextRevisionDate) {
      autoNextRevision = new Date(nextRevisionDate);
    } else if (order.revisionCategory?.intervalMonths) {
      autoNextRevision = new Date();
      autoNextRevision.setMonth(autoNextRevision.getMonth() + order.revisionCategory.intervalMonths);
    }

    const transactionOperations: any[] = [
      prisma.order.update({
        where: { id: order.id, status: { not: 'COMPLETED' } },
        data: {
          status: 'COMPLETED',
          reportFile,
          price: finalPrice,
          invoiceFile: invoiceFile || null,
          invoiceDueDate: invoiceDueDate ? new Date(invoiceDueDate) : null,
          revisionResult: revisionResult || 'PASS',
          revisionNotes: revisionNotes || null,
          nextRevisionDate: autoNextRevision,
          completedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: session.user.id, creditBalance: { gte: feeAmount } },
        data: { creditBalance: { decrement: feeAmount } }
      })
    ];

    if (invoiceFile) {
      transactionOperations.push(
        prisma.payoutRequest.create({
          data: {
            technicianId: session.user.id,
            amount: finalPrice,
            invoiceUrl: invoiceFile,
            orderId: order.id,
            dueDate: invoiceDueDate ? new Date(invoiceDueDate) : null,
            iban: currentUser.bankAccount || null,
            status: 'PENDING'
          }
        })
      );
    }

    const transactionResult = await prisma.$transaction(transactionOperations);
    const updatedOrder = transactionResult[0];

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
    
    // Odeslat speciální e-mail o dokončení s částkou a odkazem
    if (order.customer?.email && order.customer?.emailNotifications) {
      const emailData = orderCompletedEmail({
        readableId: order.readableId,
        serviceType: order.serviceType,
        address: order.address,
        customerName: order.customer.name,
        price: finalPrice,
        dueDate: invoiceDueDate ? new Date(invoiceDueDate) : null
      });
      sendMail({
        to: order.customer.email,
        ...emailData,
      }).catch(console.error);
    } else {
      sendOrderStatusEmail(order.id, 'COMPLETED').catch(console.error);
    }
    
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
      error.code === 'P2025'
    ) {
      if (session?.user?.id) {
        const freshUser = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (freshUser && feeAmount !== undefined && freshUser.creditBalance < feeAmount) {
          return NextResponse.json({ message: `Nedostatek kreditu pro dokončení (změněno v jiné transakci). Chybí vám ${(feeAmount - freshUser.creditBalance).toLocaleString('cs-CZ')} Kč. Dobijte si kredit v nastavení.` }, { status: 402 });
        }
      }
      return NextResponse.json({ message: 'Zakázka je již dokončena nebo neexistuje' }, { status: 400 });
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
