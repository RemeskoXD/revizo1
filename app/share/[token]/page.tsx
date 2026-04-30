import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ShieldCheck, FileText, Download, Calendar, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({ where: { token } });

  if (!shareLink || !shareLink.isActive) return notFound();
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) return notFound();

  await prisma.shareLink.update({ where: { id: shareLink.id }, data: { viewCount: { increment: 1 } } });

  const orderIds = JSON.parse(shareLink.orderIds) as string[];
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, status: 'COMPLETED' },
    include: { revisionCategory: true },
    orderBy: { completedAt: 'desc' },
  });

  const now = new Date();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-brand-yellow rounded-lg">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sdílené revizní dokumenty</h1>
            {shareLink.label && <p className="text-gray-400 text-sm">{shareLink.label}</p>}
            <p className="text-xs text-gray-500">Revizone.cz · Bezpečně sdíleno</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-12 text-center">
            <p className="text-gray-500">Žádné dokumenty k zobrazení.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const intervalMonths = order.revisionCategory?.intervalMonths || 36;
              const completedDate = order.completedAt ? new Date(order.completedAt) : new Date(order.updatedAt);
              const expiresDate = new Date(completedDate);
              expiresDate.setMonth(expiresDate.getMonth() + intervalMonths);
              const isValid = expiresDate > now;
              const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000*60*60*24));

              const ResultIcon = order.revisionResult === 'PASS' ? CheckCircle2 : 
                                 order.revisionResult === 'FAIL' ? XCircle : AlertTriangle;
              const resultColor = order.revisionResult === 'PASS' ? 'text-green-500' : 
                                  order.revisionResult === 'FAIL' ? 'text-red-500' : 'text-orange-500';
              const resultLabel = order.revisionResult === 'PASS' ? 'Vyhovuje' : 
                                  order.revisionResult === 'FAIL' ? 'Nevyhovuje' : 'S výhradami';

              return (
                <div key={order.id} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{order.serviceType}</h3>
                        <p className="text-xs text-gray-500">{order.address} · #{order.readableId}</p>
                      </div>
                    </div>
                    {order.revisionResult && (
                      <div className={`flex items-center gap-1.5 ${resultColor}`}>
                        <ResultIcon className="w-4 h-4" />
                        <span className="text-xs font-bold">{resultLabel}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500 text-xs">Datum revize</p>
                      <p className="text-white">{completedDate.toLocaleDateString('cs-CZ')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Platnost do</p>
                      <p className={isValid ? 'text-green-400' : 'text-red-400'}>
                        {expiresDate.toLocaleDateString('cs-CZ')}
                        {isValid ? ` (${daysLeft} dní)` : ' (EXPIROVÁNO)'}
                      </p>
                    </div>
                  </div>

                  {order.revisionNotes && (
                    <div className="p-3 bg-[#111] rounded-lg border border-white/5 mb-4">
                      <p className="text-xs text-gray-400 mb-1">Poznámky z revize:</p>
                      <p className="text-sm text-gray-300">{order.revisionNotes}</p>
                    </div>
                  )}

                  {order.reportFile && (
                    <a href={`/api/orders/${order.readableId}/download`} download
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors w-fit">
                      <Download className="w-4 h-4" /> Stáhnout revizní zprávu (PDF)
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-12">
          Tento odkaz byl vygenerován systémem Revizone · {shareLink.expiresAt ? `Platný do ${new Date(shareLink.expiresAt).toLocaleDateString('cs-CZ')}` : 'Bez omezení platnosti'}
        </p>
      </div>
    </div>
  );
}
