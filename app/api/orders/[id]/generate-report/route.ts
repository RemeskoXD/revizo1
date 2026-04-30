import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateReportHtml, type ReportData } from '@/lib/report-template';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

const BODY_MAX = 600_000;
const MAX_LIST = 200;
const RESULTS = new Set(['PASS', 'FAIL', 'PASS_WITH_NOTES']);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`gen-report:${session.user.id}`, 60, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho generování. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { id } = await params;
    const reportData = await readJsonBody<Partial<ReportData>>(req, BODY_MAX);

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        technician: { select: { name: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (order.technicianId !== session.user.id && order.companyId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const rawResult = reportData.result;
    const result =
      typeof rawResult === 'string' && RESULTS.has(rawResult) ? rawResult : 'PASS';

    const checkpoints = Array.isArray(reportData.checkpoints)
      ? reportData.checkpoints.slice(0, MAX_LIST)
      : [];
    const measurements = Array.isArray(reportData.measurements)
      ? reportData.measurements.slice(0, MAX_LIST)
      : [];
    const defects = Array.isArray(reportData.defects) ? reportData.defects.slice(0, MAX_LIST) : [];

    const fullData: ReportData = {
      orderReadableId: order.readableId,
      serviceType: order.serviceType,
      propertyType: order.propertyType,
      address: order.confirmedAddress || order.address,
      customerName: order.customer?.name || 'Neuvedeno',
      customerPhone: order.customer?.phone || 'Neuvedeno',
      customerEmail: order.customer?.email || 'Neuvedeno',
      technicianName: reportData.technicianName || order.technician?.name || session.user.name || 'Neuvedeno',
      technicianCert: String(reportData.technicianCert || '').slice(0, 500),
      technicianPhone: reportData.technicianPhone || order.technician?.phone || '',
      revisionDate: reportData.revisionDate || new Date().toLocaleDateString('cs-CZ'),
      nextRevisionDate: String(reportData.nextRevisionDate || '').slice(0, 80),
      result,
      standards: String(reportData.standards || 'ČSN 33 1500, ČSN 33 2000-6').slice(0, 500),
      checkpoints,
      measurements,
      defects,
      notes: String(reportData.notes || '').slice(0, 20_000),
      conclusion: String(reportData.conclusion || '').slice(0, 10_000),
    };

    const html = generateReportHtml(fullData);

    return NextResponse.json({ html });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Data zprávy jsou příliš velká' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Generate report error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
