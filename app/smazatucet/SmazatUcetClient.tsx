'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Send } from 'lucide-react';

export function SmazatUcetClient() {
  const { data: session, status } = useSession();
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!password.trim()) {
      setMsg({ type: 'err', text: 'Zadejte heslo.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/user/account-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'ok', text: data.message || 'Žádost byla odeslána.' });
        setPassword('');
        setNote('');
      } else {
        setMsg({ type: 'err', text: data.message || 'Chyba' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Chyba připojení.' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6 text-center">
        <p className="text-gray-300 mb-4">Pro podání žádosti o smazání účtu se musíte přihlásit.</p>
        <Link
          href="/login?callbackUrl=/smazatucet"
          className="inline-flex rounded-lg bg-brand-yellow px-6 py-2.5 font-semibold text-black hover:bg-brand-yellow-hover"
        >
          Přihlásit se
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Podat žádost</h2>
      <p className="text-sm text-gray-400">
        Přihlášený účet: <strong className="text-gray-200">{session.user.email}</strong>
      </p>
      {msg && (
        <div
          className={
            msg.type === 'ok'
              ? 'rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400'
              : 'rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400'
          }
        >
          {msg.text}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-400">Heslo k účtu (ověření)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-lg border border-white/10 bg-[#111] px-4 py-2.5 text-white focus:border-brand-yellow/50 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-400">Doplňující poznámka (volitelné)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-white/10 bg-[#111] px-4 py-2.5 text-white focus:border-brand-yellow/50 focus:outline-none"
          placeholder="Např. důvod žádosti…"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow py-2.5 font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
        Odeslat žádost ke schválení
      </button>
      <p className="text-xs text-gray-500">
        Po odeslání žádosti můžete zůstat přihlášeni, dokud administrátor žádost nevyřídí. Po schválení se nebudete moci
        přihlásit.
      </p>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm text-gray-500 hover:text-gray-300"
      >
        Odhlásit se
      </button>
    </form>
  );
}
