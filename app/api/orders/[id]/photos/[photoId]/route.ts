import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id, photoId } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    const isCustomer = order.customerId === session.user.id;
    const isTechnician = order.technicianId === session.user.id;
    const isCompany = order.companyId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPPORT';

    if (!isCustomer && !isTechnician && !isCompany && !isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const photo = await prisma.orderPhoto.findFirst({ where: { id: photoId, orderId: id } });
    if (!photo) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    return NextResponse.json({ imageData: photo.imageData });
  } catch (error) {
    console.error('Get photo error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
