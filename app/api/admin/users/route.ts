import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || 'all';
    const companyFilter = searchParams.get('company') || 'all';
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    if (search) {
      const q = search.trim();
      const cleanDigits = q.replace(/\s+/g, '');
      const orList: any[] = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { address: { contains: q } },
        { ico: { contains: q } },
        { id: { contains: q } },
        { bankAccount: { contains: q } },
        { inviteCode: { contains: q } },
        { company: { name: { contains: q } } },
      ];

      if (cleanDigits.length >= 3 && cleanDigits !== q) {
        orList.push({ phone: { contains: cleanDigits } });
        orList.push({ ico: { contains: cleanDigits } });
      }

      conditions.push({ OR: orList });
    }

    if (roleFilter !== 'all') {
      conditions.push({ role: roleFilter });
    }

    if (companyFilter !== 'all') {
      conditions.push({
        OR: [
          { companyId: companyFilter },
          { role: 'COMPANY_ADMIN', id: companyFilter }
        ]
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true, email: true } },
          authorizedCategories: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) }, { status: 200 });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATED_USER',
        details: `Vytvořen uživatel ${email} s rolí ${role}`,
        targetId: user.id
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
