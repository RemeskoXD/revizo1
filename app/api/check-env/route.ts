import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ 
    dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
    dbUser: process.env.DB_USER ? 'Set' : 'Not set'
  });
}
