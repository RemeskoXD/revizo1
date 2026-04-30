'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedItem } from '@/components/AnimatedItem';

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: string;
  messageId: string | null;
  error: string | null;
  orderId: string | null;
  userId: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ORDER_CONFIRMATION: { label: 'Potvrzení objednávky', color: 'text-brand-yellow bg-brand-yellow/10' },
  ORDER_STATUS: { label: 'Změna statusu', color: 'text-blue-400 bg-blue-500/10' },
  EXPIRY_WARNING: { label: 'Upozornění expirace', color: 'text-orange-400 bg-orange-500/10' },
  EXPIRY_EXPIRED: { label: 'Expirovaná revize', color: 'text-red-400 bg-red-500/10' },
  GENERAL: { label: 'Ostatní', color: 'text-gray-400 bg-gray-500/10' },
};

const STATUS_ICONS: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  SENT: { icon: CheckCircle2, color: 'text-green-500', label: 'Odesláno' },
  FAILED: { icon: XCircle, color: 'text-red-500', label: 'Chyba' },
  SKIPPED: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Přeskočeno' },
};

export default function EmailsClient() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));

      const res = await fetch(`/api/admin/emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, page]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmails();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-brand-yellow" />
          E-mailový log
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Přehled všech odeslaných e-mailů z platformy. Celkem: <span className="text-white font-semibold">{total}</span>
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat podle e-mailu, předmětu, ID objednávky..."
            className="w-full bg-[#111] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
          />
        </form>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-brand-yellow/50 outline-none"
        >
          <option value="">Všechny typy</option>
          <option value="ORDER_CONFIRMATION">Potvrzení objednávky</option>
          <option value="ORDER_STATUS">Změna statusu</option>
          <option value="EXPIRY_WARNING">Upozornění expirace</option>
          <option value="EXPIRY_EXPIRED">Expirovaná revize</option>
          <option value="GENERAL">Ostatní</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-brand-yellow/50 outline-none"
        >
          <option value="">Všechny stavy</option>
          <option value="SENT">Odesláno</option>
          <option value="FAILED">Chyba</option>
          <option value="SKIPPED">Přeskočeno</option>
        </select>
      </div>

      {/* Email list */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Načítám...</div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Žádné e-maily nebyly nalezeny.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {emails.map((email, idx) => {
              const typeCfg = TYPE_LABELS[email.type] || TYPE_LABELS.GENERAL;
              const statusCfg = STATUS_ICONS[email.status] || STATUS_ICONS.SENT;
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedId === email.id;

              return (
                <div
                  key={email.id}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : email.id)}
                >
                  <div className="flex items-center gap-4 p-4">
                    <StatusIcon className={cn("w-4 h-4 shrink-0", statusCfg.color)} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{email.subject}</span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", typeCfg.color)}>
                          {typeCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>→ {email.to}</span>
                        {email.orderId && <span className="font-mono">#{email.orderId.slice(0, 8)}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{new Date(email.createdAt).toLocaleDateString('cs-CZ')}</p>
                      <p className="text-[10px] text-gray-600">{new Date(email.createdAt).toLocaleTimeString('cs-CZ')}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-[#111] rounded-lg p-4 space-y-3 text-sm border border-white/5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-500 text-xs uppercase">Příjemce</span>
                            <p className="text-white">{email.to}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs uppercase">Stav</span>
                            <p className={statusCfg.color}>{statusCfg.label}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs uppercase">Typ</span>
                            <p className="text-white">{typeCfg.label}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs uppercase">Datum</span>
                            <p className="text-white">{new Date(email.createdAt).toLocaleString('cs-CZ')}</p>
                          </div>
                        </div>
                        {email.messageId && (
                          <div>
                            <span className="text-gray-500 text-xs uppercase">Message ID</span>
                            <p className="text-gray-400 font-mono text-xs break-all">{email.messageId}</p>
                          </div>
                        )}
                        {email.error && (
                          <div>
                            <span className="text-red-500 text-xs uppercase">Chyba</span>
                            <p className="text-red-400 text-xs break-all">{email.error}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 text-xs uppercase">Předmět</span>
                          <p className="text-white">{email.subject}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Strana {page} z {totalPages} ({total} e-mailů)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
