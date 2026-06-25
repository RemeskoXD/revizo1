'use client';

import { DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function OutstandingPaymentsClient({ orders }: { orders: any[] }) {
  const unpaidOrders = orders.filter(o => !o.isPaid && o.price && o.price > 0 && o.status === 'COMPLETED');
  const paidOrders = orders.filter(o => o.isPaid && o.price && o.price > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Vystavené platby</h1>
        <p className="text-gray-400">
          Zde vidíte všechny vystavené platby k vašim revizím. Platby je nutné uhradit nejpozději do 14 dnů od provedení revize.
        </p>
      </div>

      {unpaidOrders.length === 0 && paidOrders.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Zatím žádné platby</h3>
          <p className="text-gray-400">Zatím nemáte žádné vystavené ani zaplacené revize.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {unpaidOrders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-yellow"></div>
                Čeká na zaplacení
              </h2>
              <div className="grid gap-4">
                {unpaidOrders.map(order => {
                  const isOverdue = order.completedAt ? new Date().getTime() - new Date(order.completedAt).getTime() > 14 * 24 * 60 * 60 * 1000 : false;
                  return (
                  <div key={order.id} className={`bg-[#1A1A1A] border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isOverdue ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-brand-yellow/20'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-brand-yellow">Objednávka #{order.readableId}</span>
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 uppercase tracking-wider">
                            Po splatnosti
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-yellow/10 text-brand-yellow uppercase tracking-wider">
                            Splatné do 14 dnů
                          </span>
                        )}
                      </div>
                      <p className="text-white text-lg font-medium">{order.serviceType}</p>
                      <p className="text-sm text-gray-500">{order.address}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Dokončeno: {order.completedAt ? new Date(order.completedAt).toLocaleDateString('cs-CZ') : '-'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col md:items-end gap-3">
                      <div className="text-2xl font-bold text-white">
                        {order.price?.toLocaleString('cs-CZ')} Kč
                      </div>
                      <Link 
                        href={`/pay/${order.readableId}`}
                        target="_blank"
                        className={`px-6 py-2.5 text-black text-sm font-semibold rounded-lg transition-colors text-center shadow-lg ${isOverdue ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-brand-yellow hover:bg-brand-yellow-hover shadow-brand-yellow/10'}`}
                      >
                        Zobrazit podklady k platbě
                      </Link>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {paidOrders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Historie plateb</h2>
              <div className="grid gap-4">
                {paidOrders.map(order => (
                  <div key={order.id} className="bg-[#111] border border-white/5 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-400">Objednávka #{order.readableId}</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Zaplaceno
                        </span>
                      </div>
                      <p className="text-gray-300 text-base font-medium">{order.serviceType}</p>
                      <p className="text-sm text-gray-500">{order.address}</p>
                    </div>
                    
                    <div className="flex flex-col md:items-end gap-1">
                      <div className="text-lg font-bold text-gray-300">
                        {order.price?.toLocaleString('cs-CZ')} Kč
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
