'use client';

import { useMemo, useState, useEffect } from 'react';
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
  Building,
  ShieldCheck,
  MapPin,
  Loader2,
} from 'lucide-react';
import type { User } from '@prisma/client';
import { motion } from 'motion/react';
import { getRoleDisplayName } from '@/lib/role-labels';
import { cn } from '@/lib/utils';
import { isRevisionAuthExpired, isRevisionAuthRole } from '@/lib/revision-auth-core';

type UserWithCompany = User & {
  company: { id: string; name: string | null; email: string | null } | null;
  authorizedCategories?: { id: string; name: string }[];
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
  revisionCategories,
  userRole,
  currentUserId,
  initialSearch = '',
  initialRoleFilter = 'all',
  initialCompanyFilter = 'all',
}: {
  initialUsers: UserWithCompany[];
  companies: { id: string; label: string }[];
  revisionCategories?: { id: string; name: string }[];
  userRole: string;
  currentUserId: string;
  initialSearch?: string;
  initialRoleFilter?: string;
  initialCompanyFilter?: string;
}) {
  const [users, setUsers] = useState<UserWithCompany[]>(initialUsers);
  const [totalCount, setTotalCount] = useState(initialUsers.length);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 50;

  const [search, setSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter);
  const [companyFilter, setCompanyFilter] = useState<string>(initialCompanyFilter);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<number>(0);
  const [editRole, setEditRole] = useState<string>('');
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const [revisionModalUserId, setRevisionModalUserId] = useState<string | null>(null);
  const [revisionModalDate, setRevisionModalDate] = useState('');
  const [revisionSaving, setRevisionSaving] = useState(false);

  const [technicianModal, setTechnicianModal] = useState<null | {
    userId: string;
    credit: number;
    categories: string[];
    user: UserWithCompany;
  }>(null);
  const [techSaving, setTechSaving] = useState(false);

  const [objectLimitsModal, setObjectLimitsModal] = useState<null | {
    userId: string;
    email: string | null;
    role: string;
  }>(null);
  const [objectLimitsState, setObjectLimitsState] = useState<{
    loading: boolean;
    saving: boolean;
    usedCount: number;
    computedLimit: number | null;
    roleBase: number | null;
    objectLimitBase: number;
    objectLimitExtraPaid: number;
    objectPackagePaid: boolean;
    objectLimitOverride: number | '';
  }>({
    loading: false,
    saving: false,
    usedCount: 0,
    computedLimit: null,
    roleBase: null,
    objectLimitBase: 0,
    objectLimitExtraPaid: 0,
    objectPackagePaid: false,
    objectLimitOverride: '',
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [isCreating, setIsCreating] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const showAlert = (title: string, message: string) => {
    setAlertModal({ title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ title, message, onConfirm });
  };

  const canModerate = userRole === 'ADMIN' || userRole === 'SUPPORT';

  useEffect(() => {
    // We can't rely just on initialUsers if filters change
    // but initially we don't want to double fetch.
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(roleFilter)}&company=${encodeURIComponent(companyFilter)}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
          setTotalCount(data.total);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300); // debounce search
    
    return () => clearTimeout(timeout);
  }, [page, search, roleFilter, companyFilter]);

  // Remove the client side filtering useMemo
  const filteredUsers = users;

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
        showAlert('Chyba', data.message || 'Došlo k chybě při vytváření uživatele.');
      }
    } catch (error) {
      console.error(error);
      showAlert('Chyba', 'Došlo k chybě při vytváření uživatele.');
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
        showAlert('Chyba', 'Došlo k chybě při ukládání změn.');
      }
    } catch (error) {
      console.error(error);
      showAlert('Chyba', 'Došlo k chybě při ukládání změn.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    showConfirm('Smazat uživatele', 'Opravdu chcete smazat tohoto uživatele? Tato akce je nevratná.', async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setUsers(users.filter(u => u.id !== userId));
        } else {
          const data = await res.json();
          showAlert('Upozornění', data.message || 'Došlo k chybě při mazání uživatele.');
        }
      } catch (error) {
        console.error(error);
        showAlert('Chyba', 'Došlo k chybě při mazání uživatele.');
      }
    });
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
        showAlert('Chyba', (data as { message?: string }).message || 'Chyba při ukládání.');
      }
    } finally {
      setRevisionSaving(false);
    }
  };

  const openTechnicianModal = (u: UserWithCompany) => {
    setTechnicianModal({
      userId: u.id,
      credit: u.creditBalance || 0,
      categories: u.authorizedCategories?.map(c => c.id) || [],
      user: u
    });
  };

  const saveTechnicianModal = async () => {
    if (!technicianModal) return;
    setTechSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${technicianModal.userId}/technician-details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditBalance: technicianModal.credit,
          authorizedCategories: technicianModal.categories
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === technicianModal.userId
              ? { ...u, creditBalance: data.creditBalance, authorizedCategories: data.authorizedCategories }
              : u
          )
        );
        setTechnicianModal(null);
      } else {
        showAlert('Chyba', data.message || 'Chyba při ukládání.');
      }
    } finally {
      setTechSaving(false);
    }
  };

  const openObjectLimitsModal = async (u: UserWithCompany) => {
    setObjectLimitsModal({ userId: u.id, email: u.email, role: u.role });
    setObjectLimitsState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/admin/users/${u.id}/object-limits`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setObjectLimitsState({
          loading: false,
          saving: false,
          usedCount: data.usedCount ?? 0,
          computedLimit: data.computedLimit ?? null,
          roleBase: data.roleBase ?? null,
          objectLimitBase: data.objectLimitBase ?? 0,
          objectLimitExtraPaid: data.objectLimitExtraPaid ?? 0,
          objectPackagePaid: Boolean(data.objectPackagePaid),
          objectLimitOverride:
            typeof data.objectLimitOverride === 'number' && data.objectLimitOverride > 0
              ? data.objectLimitOverride
              : '',
        });
      } else {
        showAlert('Chyba', data.message || 'Nepodařilo se načíst limity objektů.');
        setObjectLimitsModal(null);
      }
    } catch {
      showAlert('Chyba', 'Nepodařilo se načíst limity objektů.');
      setObjectLimitsModal(null);
    }
  };

  const saveObjectLimitsModal = async () => {
    if (!objectLimitsModal) return;
    setObjectLimitsState((s) => ({ ...s, saving: true }));
    try {
      const payload: Record<string, unknown> = {
        objectLimitBase: objectLimitsState.objectLimitBase,
        objectLimitExtraPaid: objectLimitsState.objectLimitExtraPaid,
        objectPackagePaid: objectLimitsState.objectPackagePaid,
        objectLimitOverride:
          objectLimitsState.objectLimitOverride === '' || Number(objectLimitsState.objectLimitOverride) <= 0
            ? null
            : Number(objectLimitsState.objectLimitOverride),
      };
      const res = await fetch(`/api/admin/users/${objectLimitsModal.userId}/object-limits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setObjectLimitsModal(null);
      } else {
        showAlert('Chyba', data.message || 'Nepodařilo se uložit změny.');
      }
    } catch {
      showAlert('Chyba', 'Nepodařilo se uložit změny.');
    } finally {
      setObjectLimitsState((s) => ({ ...s, saving: false }));
    }
  };

  const resetObjectLimitsModal = () => {
    setObjectLimitsState((s) => ({
      ...s,
      objectLimitBase: 0,
      objectLimitExtraPaid: 0,
      objectPackagePaid: false,
      objectLimitOverride: '',
    }));
  };

  const handleToggleBan = async (userId: string, banned: boolean) => {
    showConfirm(
      banned ? 'Zablokovat uživatele' : 'Odblokovat uživatele',
      banned
        ? 'Zablokovat tohoto uživatele? Nebude se moci přihlásit a aktivní relace bude ukončena.'
        : 'Odblokovat tohoto uživatele?',
      async () => {
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
            showAlert('Chyba', data.message || 'Chyba při změně stavu účtu.');
          }
        } catch (e) {
          console.error(e);
          showAlert('Chyba', 'Chyba při změně stavu účtu.');
        } finally {
          setBanLoadingId(null);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-[#111] p-3 sm:p-4 sm:col-span-2 lg:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Hledat uživatele</label>
            <div className="relative">
              {isLoading ? (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-yellow animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              )}
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Jméno / název, e-mail, telefon, adresa, IČO…"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] py-2 pl-10 pr-10 text-sm text-white placeholder-gray-500 transition-colors focus:border-white/30 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  title="Vymazat vyhledávání"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#111] p-3 sm:p-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
              }}
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

      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>
          Celkem nalezeno: <strong className="text-white">{totalCount}</strong> uživatelů
          {search && <span> pro výraz „<span className="text-brand-yellow">{search}</span>“</span>}
        </span>
        {isLoading && <span className="text-brand-yellow flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Načítám...</span>}
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
                                    <option value="TECHNICIAN">Revizní technik</option>
                                    <option value="COMPANY_ADMIN">Firma (Pracujeme v týmu)</option>
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
                                        <Mail className="w-3 h-3 shrink-0" /> <span className="truncate max-w-[190px]" title={user.email || ''}>{user.email}</span>
                                        {user.emailVerified && <span title="E-mail ověřen"><CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /></span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Phone className="w-3 h-3 shrink-0" /> <span>{user.phone || 'Nenastaveno'}</span>
                                    </div>
                                    {user.address && (
                                        <div className="flex items-center gap-2 text-xs text-gray-400" title={user.address}>
                                            <MapPin className="w-3 h-3 shrink-0 text-gray-500" />
                                            <span className="truncate max-w-[190px]">{user.address}</span>
                                        </div>
                                    )}
                                    {user.ico && (
                                        <div className="text-[11px] font-mono text-gray-400 pl-5">
                                            IČO: {user.ico}
                                        </div>
                                    )}
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
                                    {canModerate && user.emailVerified === null && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          showConfirm('Ověřit e-mail', 'Opravdu chcete ručně ověřit e-mail tohoto uživatele?', async () => {
                                            try {
                                              const res = await fetch(`/api/admin/users/${user.id}/verify-email`, { method: 'POST' });
                                              if (res.ok) window.location.reload();
                                              else showAlert('Chyba', 'Chyba při ověřování');
                                            } catch (e) {
                                              console.error(e);
                                              showAlert('Chyba', 'Chyba při ověřování');
                                            }
                                          });
                                        }}
                                        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors"
                                      >
                                        Ověřit
                                      </button>
                                    )}
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
                                    {userRole === 'ADMIN' && ['CUSTOMER', 'SVJ', 'COMPANY_ADMIN'].includes(user.role) && (
                                      <button
                                        type="button"
                                        onClick={() => openObjectLimitsModal(user)}
                                        title="Limity objektů"
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                      >
                                        <Building className="w-4 h-4" />
                                      </button>
                                    )}
                                    {userRole === 'ADMIN' && user.role === 'TECHNICIAN' && (
                                      <button
                                        type="button"
                                        onClick={() => openTechnicianModal(user)}
                                        title="Detail technika (kredit, oprávnění)"
                                        className="p-2 text-brand-yellow hover:text-white hover:bg-brand-yellow/10 rounded-lg transition-colors"
                                      >
                                        <ShieldCheck className="w-4 h-4" />
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
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-white/5 p-4 bg-[#111]">
          <div className="text-sm text-gray-400">
            Zobrazeno {users.length} z {totalCount} uživatelů
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="px-3 py-1 text-sm bg-white/5 rounded hover:bg-white/10 disabled:opacity-50"
            >
              Předchozí
            </button>
            <span className="text-sm text-white px-2">Strana {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= totalCount || isLoading}
              className="px-3 py-1 text-sm bg-white/5 rounded hover:bg-white/10 disabled:opacity-50"
            >
              Další
            </button>
          </div>
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

      {technicianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Detail technika</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {technicianModal.user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTechnicianModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Kredit pro poptávky (Kč)
                </label>
                <input
                  type="number"
                  value={technicianModal.credit}
                  onChange={(e) => setTechnicianModal(s => s ? { ...s, credit: parseFloat(e.target.value) || 0 } : s)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
                />
                <p className="mt-1 text-xs text-gray-500">Můžete ručně přidat nebo odebrat kredit z peněženky technika.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Oprávnění k provádění revizí (Kategorie)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 rounded-lg border border-white/5 bg-[#161616] p-3">
                  {revisionCategories?.map(cat => (
                    <label key={cat.id} className="flex items-center gap-3 cursor-pointer p-1 hover:bg-white/5 rounded">
                      <input
                        type="checkbox"
                        checked={technicianModal.categories.includes(cat.id)}
                        onChange={(e) => {
                          const newCategories = e.target.checked
                            ? [...technicianModal.categories, cat.id]
                            : technicianModal.categories.filter(id => id !== cat.id);
                          setTechnicianModal(s => s ? { ...s, categories: newCategories } : s);
                        }}
                        className="rounded border-gray-600 text-brand-yellow focus:ring-brand-yellow/30 bg-[#1A1A1A]"
                      />
                      <span className="text-sm text-white">{cat.name}</span>
                    </label>
                  ))}
                  {(!revisionCategories || revisionCategories.length === 0) && (
                    <p className="text-xs text-gray-500 italic">Žádné kategorie v databázi.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void saveTechnicianModal()}
                disabled={techSaving}
                className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
              >
                {techSaving ? 'Ukládám…' : 'Uložit změny'}
              </button>
            </div>
          </div>
        </div>
      )}

      {objectLimitsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Limity objektů</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {objectLimitsModal.email || objectLimitsModal.userId} ·{' '}
                  <span className="text-gray-300">{getRoleDisplayName(objectLimitsModal.role)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setObjectLimitsModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {objectLimitsState.loading ? (
              <div className="py-12 text-center text-sm text-gray-500">Načítám…</div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500">Aktuálně využito</div>
                    <div className="mt-1 text-xl font-bold text-white">{objectLimitsState.usedCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Výpočet limit</div>
                    <div className="mt-1 text-xl font-bold text-emerald-400/90">
                      {objectLimitsState.computedLimit ?? '∞'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Default z role</div>
                    <div className="mt-1 text-xl font-bold text-gray-300">
                      {objectLimitsState.roleBase ?? '∞'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400">
                      Vlastní základ (0 = použít default z role)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={objectLimitsState.objectLimitBase}
                      onChange={(e) =>
                        setObjectLimitsState((s) => ({
                          ...s,
                          objectLimitBase: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
                    />
                  </div>

                  {objectLimitsModal.role === 'CUSTOMER' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400">
                        Počet zaplacených dalších objektů (CUSTOMER) – á 100 Kč / rok
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={objectLimitsState.objectLimitExtraPaid}
                        onChange={(e) =>
                          setObjectLimitsState((s) => ({
                            ...s,
                            objectLimitExtraPaid: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
                      />
                    </div>
                  )}

                  {(objectLimitsModal.role === 'SVJ' || objectLimitsModal.role === 'COMPANY_ADMIN') && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2">
                      <input
                        type="checkbox"
                        checked={objectLimitsState.objectPackagePaid}
                        onChange={(e) =>
                          setObjectLimitsState((s) => ({
                            ...s,
                            objectPackagePaid: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-brand-yellow"
                      />
                      <span className="text-sm text-gray-300">
                        Balíček do 10 objektů aktivní (600 Kč / rok)
                      </span>
                    </label>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-400">
                      Individuální nabídka (override) – ponechte prázdné pro zrušení
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={objectLimitsState.objectLimitOverride}
                      onChange={(e) => {
                        const v = e.target.value;
                        setObjectLimitsState((s) => ({
                          ...s,
                          objectLimitOverride: v === '' ? '' : Math.max(1, parseInt(v, 10) || 0),
                        }));
                      }}
                      placeholder="např. 25 (nad rámec balíčku do 10)"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white placeholder-gray-600"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Pokud je vyplněno, má přednost před vším výše. Vhodné pro klienty s
                      individuální nabídkou nad 10 objektů.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetObjectLimitsModal}
                    disabled={objectLimitsState.saving}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    Vrátit na default
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveObjectLimitsModal()}
                    disabled={objectLimitsState.saving}
                    className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
                  >
                    {objectLimitsState.saving ? 'Ukládám…' : 'Uložit'}
                  </button>
                </div>
              </>
            )}
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
                    ['TECHNICIAN', 'Revizní technik'],
                    ['COMPANY_ADMIN', 'Firma (Pracujeme v týmu)'],
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

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-white">{confirmModal.title}</h3>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">{confirmModal.message}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover shadow-lg shadow-brand-yellow/10"
              >
                Potvrdit
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-white">{alertModal.title}</h3>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">{alertModal.message}</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                className="w-full rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover shadow-lg shadow-brand-yellow/10"
              >
                Rozumím
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
