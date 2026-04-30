import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { photoId } = await params;

    const photo = await prisma.orderPhoto.findUnique({ where: { id: photoId } });
    if (!photo) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    return NextResponse.json({ imageData: photo.imageData });
  } catch (error) {
    console.error('Get photo error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
