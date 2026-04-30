'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Shield,
  User as UserIcon,
  Mail,
  Phone,
  CheckCircle2,
  Edit2,
  Plus,
  X,
  CalendarClock,
  Ban,
  Calendar,
} from 'lucide-react';
import type { User } from '@prisma/client';
import { motion } from 'motion/react';
import { getRoleDisplayName } from '@/lib/role-labels';
import { cn } from '@/lib/utils';
import { isRevisionAuthExpired, isRevisionAuthRole } from '@/lib/revision-auth-core';

type UserWithCompany = User & {
  company: { id: string; name: string | null; email: string | null } | null;
};

const ROLE_FILTER_VALUES = [
  'CUSTOMER',
  'TECHNICIAN',
  'COMPANY_ADMIN',
  'PRODUCT_MANAGER',
  'REALTY',
  'SVJ',
  'ADMIN',
  'SUPPORT',
  'CONTRACTOR',
  'PENDING_SUPPORT',
  'PENDING_CONTRACTOR',
] as const;

function formatLicenseCell(value: Date | string | null | undefined) {
  if (value == null) {
    return (
      <span className="text-gray-600" title="Po napojení Stripe se doplní z poslední platby">
        —
      </span>
    );
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return <span className="text-gray-600">—</span>;
  }
  const now = new Date();
  const expired = d.getTime() < now.getTime();
  const label = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  return (
    <span
      className={cn('text-xs font-medium', expired ? 'text-red-400' : 'text-emerald-400/90')}
      title={expired ? 'Platnost licence vypršela' : 'Platnost licence'}
    >
      {expired ? `Vypršela (${label})` : `do ${label}`}
    </span>
  );
}

export default function AdminUsersClient({
  initialUsers,
  companies,
  userRole,
  currentUserId,
}: {
  initialUsers: UserWithCompany[];
  companies: { id: string; label: string }[];
  userRole: string;
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<number>(0);
  const [editRole, setEditRole] = useState<string>('');
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const [revisionModalUserId, setRevisionModalUserId] = useState<string | null>(null);
  const [revisionModalDate, setRevisionModalDate] = useState('');
  const [revisionSaving, setRevisionSaving] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [isCreating, setIsCreating] = useState(false);

  const canModerate = userRole === 'ADMIN' || userRole === 'SUPPORT';

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesCompany =
        companyFilter === 'all' ||
        u.companyId === companyFilter ||
        (u.role === 'COMPANY_ADMIN' && u.id === companyFilter);
      return matchesSearch && matchesRole && matchesCompany;
    });
  }, [users, search, roleFilter, companyFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        const createdUser = (await res.json()) as User;
        const withCompany: UserWithCompany = { ...createdUser, company: null };
        setUsers([withCompany, ...users]);
        setIsCreateModalOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'CUSTOMER' });
      } else {
        const data = await res.json();
        alert(data.message || 'Došlo k chybě při vytváření uživatele.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při vytváření uživatele.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      // Save priority
      const resPriority = await fetch(`/api/admin/users/${userId}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: editPriority }),
      });

      // Save role
      const resRole = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });

      if (resPriority.ok && resRole.ok) {
        const updatedUser = await resRole.json();
        setUsers(users.map(u => u.id === userId ? { ...u, priority: editPriority, role: editRole } : u));
        setEditingUser(null);
      } else {
        alert('Došlo k chybě při ukládání změn.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při ukládání změn.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Opravdu chcete smazat tohoto uživatele? Tato akce je nevratná.')) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.message || 'Došlo k chybě při mazání uživatele.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při mazání uživatele.');
    }
  };

  const openRevisionModal = (u: UserWithCompany) => {
    setRevisionModalUserId(u.id);
    setRevisionModalDate(
      u.revisionAuthValidUntil
        ? new Date(u.revisionAuthValidUntil).toISOString().slice(0, 10)
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10)
    );
  };

  const saveRevisionModal = async (clear: boolean) => {
    if (!revisionModalUserId) return;
    setRevisionSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${revisionModalUserId}/revision-auth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionAuthValidUntil: clear ? null : revisionModalDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === revisionModalUserId
              ? { ...u, revisionAuthValidUntil: data.revisionAuthValidUntil != null ? new Date(data.revisionAuthValidUntil) : null }
              : u
          )
        );
        setRevisionModalUserId(null);
      } else {
        alert((data as { message?: string }).message || 'Chyba při ukládání.');
      }
    } finally {
      setRevisionSaving(false);
    }
  };

  const handleToggleBan = async (userId: string, banned: boolean) => {
    if (
      !confirm(
        banned
          ? 'Zablokovat tohoto uživatele? Nebude se moci přihlásit a aktivní relace bude ukončena.'
          : 'Odblokovat tohoto uživatele?'
      )
    ) {
      return;
    }
    setBanLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; bannedAt?: string | null };
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  bannedAt: data.bannedAt != null ? new Date(data.bannedAt) : null,
                }
              : u
          )
        );
      } else {
        alert(data.message || 'Chyba při změně stavu účtu.');
      }
    } catch (e) {
      console.error(e);
      alert('Chyba při změně stavu účtu.');
    } finally {
      setBanLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-[#111] p-3 sm:p-4 sm:col-span-2 lg:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Hledat</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Jméno, e-mail, telefon…"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 transition-colors focus:border-white/30 focus:outline-none"
              />
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#111] p-3 sm:p-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
            >
              <option value="all">Všechny role</option>
              {ROLE_FILTER_VALUES.map((r) => (
                <option key={r} value={r}>
                  {getRoleDisplayName(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#111] p-3 sm:p-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Firma</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
            >
              <option value="all">Všechny firmy</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover"
          >
            <Plus className="h-4 w-4" />
            Přidat uživatele
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#111]">
        <div className="table-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[1220px] text-left text-sm">
                <thead className="bg-white/5 text-xs font-semibold uppercase text-gray-400">
                    <tr>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Uživatel</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Role</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Firma</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Priorita</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Kontakt</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Licence do
                          </span>
                        </th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Revize do
                          </span>
                        </th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Status</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Registrace</th>
                        <th className="px-3 py-3 text-right sm:px-5 sm:py-4">Akce</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-gray-500 sm:px-6">
                          Žádní uživatelé neodpovídají filtru.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, index) => (
                        <motion.tr 
                          key={user.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                            <td className="px-3 py-3 sm:px-5 sm:py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-white/10">
                                        <UserIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <span className="font-medium text-white">{user.name || 'Neznámý'}</span>
                                </div>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-4">
                                {editingUser === user.id ? (
                                  <select 
                                    value={editRole} 
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="CUSTOMER">Zákazník</option>
                                    <option value="TECHNICIAN">Technik</option>
                                    <option value="COMPANY_ADMIN">Firma</option>
                                    <option value="PRODUCT_MANAGER">Produkt Manager (Realitní makléř)</option>
                                    <option value="REALTY">Produkt Manager (Realitní makléř)</option>
                                    <option value="SVJ">Správce SVJ</option>
                                    <option value="ADMIN">Admin</option>
                                  </select>
                                ) : (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      user.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-500' :
                                      user.role === 'TECHNICIAN' ? 'bg-brand-yellow/10 text-brand-yellow' :
                                      user.role === 'COMPANY_ADMIN' ? 'bg-orange-500/10 text-orange-500' :
                                      user.role === 'REALTY' ? 'bg-blue-500/10 text-blue-500' :
                                      'bg-gray-500/10 text-gray-500'
                                  }`}>
                                      {user.role === 'TECHNICIAN' && <Shield className="w-3 h-3" />}
                                      {getRoleDisplayName(user.role)}
                                  </span>
                                )}
                            </td>
                            <td className="max-w-[160px] px-3 py-3 sm:px-5 sm:py-4">
                              {user.role === 'COMPANY_ADMIN' ? (
                                <span className="text-xs text-gray-500">—</span>
                              ) : user.company ? (
                                <span
                                  className="line-clamp-2 text-xs text-gray-200"
                                  title={user.company.name?.trim() || user.company.email || undefined}
                                >
                                  {user.company.name?.trim() || user.company.email || '—'}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-4">
                                {editingUser === user.id ? (
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="number" 
                                      value={editPriority} 
                                      onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)}
                                      className="w-16 bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-white text-xs"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-mono">{user.priority}</span>
                                  </div>
                                )}
                            </td>
                            <td className="px-3 py-3 text-gray-400 sm:px-5 sm:py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs">
                                        <Mail className="w-3 h-3" /> {user.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Phone className="w-3 h-3" /> {user.phone || 'Nenastaveno'}
                                    </div>
                                </div>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-4 whitespace-nowrap">
                              {formatLicenseCell(user.licenseValidUntil)}
                            </td>
                            <td className="max-w-[130px] px-3 py-3 sm:px-5 sm:py-4">
                              {isRevisionAuthRole(user.role) ? (
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={cn(
                                      'text-xs',
                                      user.revisionAuthValidUntil == null
                                        ? 'text-gray-500'
                                        : isRevisionAuthExpired(user.role, user.revisionAuthValidUntil)
                                          ? 'text-red-400'
                                          : 'text-emerald-400/90'
                                    )}
                                  >
                                    {user.revisionAuthValidUntil
                                      ? new Date(user.revisionAuthValidUntil).toLocaleDateString('cs-CZ')
                                      : '—'}
                                  </span>
                                  {(userRole === 'ADMIN' || userRole === 'SUPPORT') && (
                                    <button
                                      type="button"
                                      onClick={() => openRevisionModal(user)}
                                      className="text-left text-[11px] font-medium text-brand-yellow hover:underline"
                                    >
                                      Upravit
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-4">
                                {user.bannedAt ? (
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                                    <Ban className="h-3 w-3 shrink-0" /> Zablokován
                                  </span>
                                ) : user.isDeleted ? (
                                  <span className="text-xs text-gray-500">Deaktivován</span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400/90">
                                    <CheckCircle2 className="h-3 w-3 shrink-0" /> Aktivní
                                  </span>
                                )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500 sm:px-5 sm:py-4">{new Date(user.createdAt).toLocaleDateString('cs-CZ')}</td>
                            <td className="px-3 py-3 text-right sm:px-5 sm:py-4">
                                {editingUser === user.id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleSaveUser(user.id)} className="text-xs text-brand-yellow hover:underline">Uložit</button>
                                    <button onClick={() => setEditingUser(null)} className="text-xs text-gray-500 hover:underline">Zrušit</button>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    {canModerate && user.id !== currentUserId && (
                                      <button
                                        type="button"
                                        disabled={banLoadingId === user.id}
                                        onClick={() => handleToggleBan(user.id, !user.bannedAt)}
                                        className={cn(
                                          'rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
                                          user.bannedAt
                                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                                            : 'text-amber-400 hover:bg-amber-500/10'
                                        )}
                                      >
                                        {banLoadingId === user.id ? '…' : user.bannedAt ? 'Odblokovat' : 'BAN'}
                                      </button>
                                    )}
                                    {userRole === 'ADMIN' && (
                                      <>
                                        <button onClick={() => { setEditingUser(user.id); setEditPriority(user.priority); setEditRole(user.role); }} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <span className="text-xs font-medium">Smazat</span>
                                        </button>
                                      </>
                                    )}
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

      {revisionModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6">
            <h3 className="text-lg font-semibold text-white">Platnost oprávnění k revizím</h3>
            <p className="mt-2 text-sm text-gray-400">
              Datum včetně – po jeho uplynutí se uživatel nebude moci přihlásit ani pracovat s revizemi, dokud administrátor platnost neprodlouží.
            </p>
            <label className="mt-4 block text-xs font-medium text-gray-500">Platné do</label>
            <input
              type="date"
              value={revisionModalDate}
              onChange={(e) => setRevisionModalDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
            />
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void saveRevisionModal(true)}
                disabled={revisionSaving}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
              >
                Zrušit omezení (bez data)
              </button>
              <button
                type="button"
                onClick={() => void saveRevisionModal(false)}
                disabled={revisionSaving}
                className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
              >
                {revisionSaving ? 'Ukládám…' : 'Uložit'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setRevisionModalUserId(null)}
              className="mt-3 w-full text-center text-sm text-gray-500 hover:text-white"
            >
              Zavřít
            </button>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Přidat uživatele</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Jméno</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-yellow/50 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-yellow/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Heslo</label>
                <input 
                  type="password" 
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-yellow/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-yellow/50 outline-none"
                >
                  {[
                    ['CUSTOMER', 'Zákazník'],
                    ['TECHNICIAN', 'Technik'],
                    ['COMPANY_ADMIN', 'Firma'],
                    ['PRODUCT_MANAGER', 'Produkt Manager (Realitní makléř)'],
                    ['REALTY', 'Produkt Manager (Realitní makléř)'],
                    ['SVJ', 'Správce SVJ'],
                    ['ADMIN', 'Admin'],
                    ['SUPPORT', 'Admin'],
                    ['CONTRACTOR', 'Admin'],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Zrušit
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Vytvářím...' : 'Vytvořit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
