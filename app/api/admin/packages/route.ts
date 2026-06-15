import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });
    
    if (!user || !['ADMIN', 'SUPPORT'].includes(user.role)) {
       return NextResponse.json({ error: 'Pouze pro administrátory' }, { status: 403 });
    }

    const { packages } = await request.json();

    // In a simple generic sync, we wipe and rewrite or perform a smart upsert
    // Since IDs can be new or old
    const currentPackagesIds = packages.filter((p: any) => !p.id.startsWith('new_')).map((p: any) => p.id);
    
    // Delete anything not in the current list
    await prisma.servicePackage.deleteMany({
      where: {
        id: { notIn: currentPackagesIds }
      }
    });

    const updatedPackages = [];

    // update or create
    let index = 0;
    for (const pkg of packages) {
      if (pkg.id.startsWith('new_')) {
        const created = await prisma.servicePackage.create({
          data: {
            name: pkg.name,
            description: pkg.description,
            approximatePrice: pkg.approximatePrice,
            isVisibleRodinnyDum: pkg.isVisibleRodinnyDum,
            isVisibleSVJ: pkg.isVisibleSVJ,
            isActive: pkg.isActive,
            orderIndex: index++,
          }
        });
        updatedPackages.push(created);
      } else {
        const updated = await prisma.servicePackage.update({
          where: { id: pkg.id },
          data: {
            name: pkg.name,
            description: pkg.description,
            approximatePrice: pkg.approximatePrice,
            isVisibleRodinnyDum: pkg.isVisibleRodinnyDum,
            isVisibleSVJ: pkg.isVisibleSVJ,
            isActive: pkg.isActive,
            orderIndex: index++,
          }
        });
        updatedPackages.push(updated);
      }
    }

    return NextResponse.json({ success: true, packages: updatedPackages });
  } catch (error) {
    console.error('Save packages error:', error);
    return NextResponse.json({ error: 'Chyba při ukládání' }, { status: 500 });
  }
}
