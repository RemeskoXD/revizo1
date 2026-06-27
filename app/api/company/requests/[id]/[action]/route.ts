import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncCompanyTechBillingForCompany } from '@/lib/company-tech-sync';

export async function POST(req: Request, { params }: { params: Promise<{ id: string, action: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'COMPANY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, action } = await params;

    const request = await prisma.companyJoinRequest.findUnique({
      where: { id }
    });

    if (!request || request.companyId !== session.user.id || request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request not found or not pending' }, { status: 404 });
    }

    if (action === 'approve') {
      // Update the request status
      const updated = await prisma.companyJoinRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'APPROVED' }
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
      }

      // Assign the technician to the company
      await prisma.user.update({
        where: { id: request.technicianId },
        data: { companyId: session.user.id }
      });

      // Reject all other pending requests for this technician
      await prisma.companyJoinRequest.updateMany({
        where: {
          technicianId: request.technicianId,
          status: 'PENDING',
          id: { not: id }
        },
        data: { status: 'REJECTED' }
      });

      // Sync billing techniků – zvýší quantity ve Stripe subscription
      syncCompanyTechBillingForCompany(session.user.id).catch((e) =>
        console.error('Tech billing sync failed:', e),
      );

    } else if (action === 'reject') {
      const updated = await prisma.companyJoinRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'REJECTED' }
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Process request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
