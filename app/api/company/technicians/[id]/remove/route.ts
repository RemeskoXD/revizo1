import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'COMPANY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if technician belongs to this company
    const technician = await prisma.user.findFirst({
      where: {
        id,
        companyId: session.user.id,
        role: 'TECHNICIAN'
      }
    });

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found or does not belong to your company' }, { status: 404 });
    }

    // Remove technician from company
    await prisma.user.update({
      where: { id },
      data: {
        companyId: null
      }
    });

    // Unassign any pending/in-progress orders from this technician
    await prisma.order.updateMany({
      where: {
        technicianId: id,
        companyId: session.user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      data: {
        technicianId: null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing technician:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
