import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action, revisionAuthValidUntil, authorizedCategoryIds } = await req.json();

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    const roleRequest = await prisma.roleRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!roleRequest) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    if (roleRequest.status !== 'PENDING') {
      return NextResponse.json({ message: 'Request already processed' }, { status: 400 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.roleRequest.update({
        where: { id, status: 'PENDING' },
        data: { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' },
        include: { user: true },
      });

      if (action === 'APPROVE') {
        const updateData: any = { role: roleRequest.requestedRole };
        if (revisionAuthValidUntil) {
          updateData.revisionAuthValidUntil = new Date(revisionAuthValidUntil);
        }
        if (Array.isArray(authorizedCategoryIds) && authorizedCategoryIds.length > 0 && ['TECHNICIAN', 'COMPANY_ADMIN'].includes(roleRequest.requestedRole)) {
          updateData.authorizedCategories = {
            connect: authorizedCategoryIds.map((catId: string) => ({ id: catId }))
          };
        }
        await tx.user.update({
          where: { id: roleRequest.userId },
          data: updateData,
        });
      }

      return updated;
    });

    return NextResponse.json(updatedRequest, { status: 200 });
  } catch (error) {
    console.error('Role request action error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
