'use client';

import { Activity } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminHistoryClient({ logs }: { logs: any[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1A1A1A]">
      <div className="table-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/5 text-xs font-semibold uppercase text-gray-400">
                  <tr>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Datum</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Uživatel</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Akce</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Detaily</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500 sm:px-6">
                        Zatím žádná historie.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, index) => (
                      <motion.tr 
                        key={log.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                          <td className="whitespace-nowrap px-3 py-3 text-gray-400 sm:px-5 sm:py-4">
                            {new Date(log.createdAt).toLocaleString('cs-CZ')}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-4">
                              <div className="font-medium text-white">{log.user.name || log.user.email}</div>
                              <div className="text-xs text-gray-500">{log.user.role}</div>
                          </td>
                          <td className="px-3 py-3 font-medium text-brand-yellow sm:px-5 sm:py-4">
                            {log.action}
                          </td>
                          <td className="max-w-[200px] px-3 py-3 text-gray-300 sm:max-w-none sm:px-5 sm:py-4">
                            {log.details || '-'}
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
