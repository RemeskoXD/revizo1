import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { readableId: id },
      include: { property: { select: { ownerId: true } } },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const isCustomer = order.customerId === session.user.id;
    const isTech = order.technicianId === session.user.id;
    const isCompany = session.user.role === 'COMPANY_ADMIN' && order.companyId === session.user.id;
    const isAdmin = ['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role);
    const isPropertyOwner = order.property?.ownerId === session.user.id;

    if (!isCustomer && !isTech && !isCompany && !isAdmin && !isPropertyOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!order.reportFile) {
      return NextResponse.json({ message: 'Report file not found' }, { status: 404 });
    }

    // Extract base64 data and mime type
    const matches = order.reportFile.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ message: 'Invalid file format' }, { status: 500 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Return the file
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Content-Disposition', `attachment; filename="Revizni_zprava_${order.readableId}.pdf"`);
    
    return response;
  } catch (error) {
    console.error('Download report error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
