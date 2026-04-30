'use client';

import { useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { RoleRequest, User } from '@prisma/client';
import { motion } from 'motion/react';
import { getRoleDisplayName } from '@/lib/role-labels';

type RequestWithUser = RoleRequest & { user: User };

export default function RoleRequestsClient({ initialRequests }: { initialRequests: RequestWithUser[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setIsLoading(requestId);
    try {
      const res = await fetch(`/api/admin/role-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const updatedRequest = await res.json();
        setRequests(requests.map(req => req.id === requestId ? updatedRequest : req));
      } else {
        alert('Došlo k chybě při zpracování žádosti.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při zpracování žádosti.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[#111] p-4 sm:p-6">
      <div className="table-scroll -mx-2 px-2 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-gray-500 border-b border-white/5">
            <tr>
              <th className="pb-3 font-medium">Uživatel</th>
              <th className="pb-3 font-medium">Požadovaná role</th>
              <th className="pb-3 font-medium">Datum žádosti</th>
              <th className="pb-3 font-medium">Stav</th>
              <th className="pb-3 font-medium text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  Zatím žádné žádosti o změnu role.
                </td>
              </tr>
            ) : (
              requests.map((req, index) => (
                <motion.tr 
                  key={req.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="group hover:bg-white/[0.02]"
                >
                  <td className="py-4">
                    <p className="text-white font-medium">{req.user.name}</p>
                    <p className="text-xs text-gray-500">{req.user.email}</p>
                  </td>
                  <td className="py-4 text-white">
                    {getRoleDisplayName(req.requestedRole)}
                  </td>
                  <td className="py-4 text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                      req.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                      req.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {req.status === 'APPROVED' && <Check className="w-3 h-3" />}
                      {req.status === 'REJECTED' && <X className="w-3 h-3" />}
                      {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {req.status === 'APPROVED' ? 'Schváleno' :
                       req.status === 'REJECTED' ? 'Zamítnuto' : 'Čeká'}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAction(req.id, 'APPROVE')}
                          disabled={isLoading === req.id}
                          className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Schválit"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'REJECT')}
                          disabled={isLoading === req.id}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Zamítnout"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
