"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailQuery = searchParams.get("email") || "";

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(emailQuery);

  useEffect(() => {
    if (token) {
      handleVerify({ token });
    }
  }, [token]);

  const handleVerify = async (payload: { token?: string, code?: string, email?: string }) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?message=E-mail byl úspěšně ověřen. Můžete se přihlásit.");
        }, 3000);
      } else {
        const data = await res.json();
        setError(data.message || "Nepodařilo se ověřit e-mail.");
      }
    } catch {
      setError("Chyba sítě. Zkuste to znovu.");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !email) {
      setError("Vyplňte e-mail a kód.");
      return;
    }
    handleVerify({ code, email });
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Úspěšně ověřeno</h2>
        <p className="text-gray-400">Přesměrovávám na přihlášení...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 sm:p-8 shadow-2xl relative z-10">
      <h1 className="text-2xl font-bold text-white text-center mb-2">Ověření e-mailu</h1>
      <p className="text-gray-400 text-center text-sm mb-6">Zadejte kód z e-mailu nebo klikněte na odkaz.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {token && loading && (
        <div className="flex flex-col items-center py-6">
          <Loader2 className="w-8 h-8 text-brand-yellow animate-spin mb-4" />
          <p className="text-gray-400">Ověřování odkazu...</p>
        </div>
      )}

      {!token && (
        <form onSubmit={submitCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Kód</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white text-center tracking-widest font-mono text-lg"
              maxLength={6}
              placeholder="123456"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ověřit kód"}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="text-gray-500 hover:text-white transition-colors">
          Zpět na přihlášení
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-[#111111] px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(800px,140vw)] w-[min(800px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-yellow/5 blur-3xl" />
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
