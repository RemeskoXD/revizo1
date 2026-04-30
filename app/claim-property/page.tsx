import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ClaimClient from './ClaimClient';

export default async function ClaimPropertyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111] text-white p-4">
        <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-2xl max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Neplatný odkaz</h1>
          <p className="text-gray-400">Tento odkaz pro převod nemovitosti je neplatný nebo chybí.</p>
        </div>
      </div>
    );
  }

  const property = await prisma.property.findUnique({
    where: { transferToken: token },
    include: { owner: { select: { name: true, email: true } } }
  });

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111] text-white p-4">
        <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-2xl max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Neplatný odkaz</h1>
          <p className="text-gray-400">Tento odkaz již není platný nebo nemovitost neexistuje.</p>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    // Redirect to login with callback
    redirect(`/login?callbackUrl=${encodeURIComponent(`/claim-property?token=${token}`)}`);
  }

  // If already claimed by this user
  if (property.claimedById === session.user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111] text-white p-4">
        <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-2xl max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-500">Již nárokováno</h1>
          <p className="text-gray-400 mb-6">Tuto nemovitost jste již nárokovali. Čeká se na potvrzení původním majitelem.</p>
          <a href="/dashboard" className="px-6 py-2 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors">
            Přejít na nástěnku
          </a>
        </div>
      </div>
    );
  }

  // If claimed by someone else
  if (property.claimedById && property.claimedById !== session.user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111] text-white p-4">
        <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-2xl max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">Již nárokováno</h1>
          <p className="text-gray-400">Tuto nemovitost již nárokoval někdo jiný.</p>
        </div>
      </div>
    );
  }

  return <ClaimClient property={property} token={token} />;
}
