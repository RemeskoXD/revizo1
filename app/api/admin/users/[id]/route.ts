import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, email: true } },
        authorizedCategories: { select: { id: true, name: true, group: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      name,
      email,
      phone,
      address,
      ico,
      bankAccount,
      role,
      priority,
      companyId,
      revisionAuthValidUntil,
      creditBalance,
      authorizedCategoryIds,
      objectLimitOverride,
      objectLimitBase,
      objectLimitExtraPaid,
      objectPackagePaid,
    } = body;

    // Check if modifying permissions allowed
    if (role !== undefined && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Only admin can change role' }, { status: 403 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (email !== undefined) dataToUpdate.email = email;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (address !== undefined) dataToUpdate.address = address;
    if (ico !== undefined) dataToUpdate.ico = ico;
    if (bankAccount !== undefined) dataToUpdate.bankAccount = bankAccount;
    if (role !== undefined) dataToUpdate.role = role;
    if (priority !== undefined) dataToUpdate.priority = Number(priority) || 1;
    if (companyId !== undefined) dataToUpdate.companyId = companyId || null;
    if (revisionAuthValidUntil !== undefined) {
      dataToUpdate.revisionAuthValidUntil = revisionAuthValidUntil ? new Date(revisionAuthValidUntil) : null;
    }
    if (creditBalance !== undefined) dataToUpdate.creditBalance = Number(creditBalance) || 0;
    if (objectLimitOverride !== undefined) {
      dataToUpdate.objectLimitOverride = objectLimitOverride === null || objectLimitOverride === '' ? null : Number(objectLimitOverride);
    }
    if (objectLimitBase !== undefined) dataToUpdate.objectLimitBase = Number(objectLimitBase) || 0;
    if (objectLimitExtraPaid !== undefined) dataToUpdate.objectLimitExtraPaid = Number(objectLimitExtraPaid) || 0;
    if (objectPackagePaid !== undefined) dataToUpdate.objectPackagePaid = Boolean(objectPackagePaid);

    if (Array.isArray(authorizedCategoryIds)) {
      dataToUpdate.authorizedCategories = {
        set: authorizedCategoryIds.map((cid: string) => ({ id: cid })),
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      include: {
        company: { select: { id: true, name: true, email: true } },
        authorizedCategories: { select: { id: true, name: true, group: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_UPDATED_USER',
        details: `Administrátor upravil uživatele ${updatedUser.email}`,
        targetId: id,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ message: 'Cannot delete yourself' }, { status: 400 });
    }

    const deletedUser = await prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'SOFT_DELETED_USER',
        details: `Deaktivován uživatel ${deletedUser.email}`,
        targetId: id,
      },
    });

    return NextResponse.json({ message: 'User deactivated' }, { status: 200 });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
