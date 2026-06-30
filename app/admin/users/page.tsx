import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminUsersClient from './AdminUsersClient';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
    redirect('/login');
  }

  const [users, companyAdmins, revisionCategories] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        company: { select: { id: true, name: true, email: true } },
        authorizedCategories: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'COMPANY_ADMIN' },
      take: 500,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true },
    }),
    prisma.revisionCategory.findMany({
      orderBy: { name: 'asc' }
    })
  ]);

  const companies = companyAdmins.map((c) => ({
    id: c.id,
    label: c.name?.trim() || c.email || c.id,
  }));

  const serializedUsers = JSON.parse(JSON.stringify(users));
  const serializedCompanies = JSON.parse(JSON.stringify(companies));
  const serializedCategories = JSON.parse(JSON.stringify(revisionCategories));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Správa uživatelů</h1>
          <p className="text-gray-400">
            Přehled uživatelů. Sloupec „Licence do“ se po napojení Stripe doplní z poslední přijaté platby.
          </p>
        </div>
      </div>

      <AdminUsersClient
        initialUsers={serializedUsers}
        companies={serializedCompanies}
        revisionCategories={serializedCategories}
        userRole={session.user.role}
        currentUserId={session.user.id}
      />
    </div>
  );
}
