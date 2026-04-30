"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = rawCallback.startsWith("/api") ? "/dashboard" : rawCallback;
  const message = searchParams.get("message");
  const blockedRedirect = searchParams.get("error") === "blocked";
  const revisionAuthRedirect = searchParams.get("error") === "revision_auth";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err) {
      setError("Došlo k chybě při přihlašování");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-[#111111] px-3 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(800px,140vw)] w-[min(800px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-yellow/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500 rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 shadow-2xl sm:p-8">
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-12 h-12 bg-brand-yellow rounded-xl shadow-lg shadow-brand-yellow/20">
            <ShieldCheck className="w-7 h-7 text-black" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">Přihlášení</h1>
        <p className="text-gray-400 text-center text-sm mb-8">Vítejte zpět v REVIZONE APLIKACE</p>

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-lg mb-6 text-center">
            {message}
          </div>
        )}

        {blockedRedirect && (
          <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
            Účet byl zablokován nebo relace ukončena. Pro návrat kontaktujte podporu.
          </div>
        )}

        {revisionAuthRedirect && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-200">
            Platnost oprávnění k provádění revizí vypršela. Obnovte ji u administrátora Revizone.
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
              placeholder="vas@email.cz"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Přihlásit se"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm text-gray-500">
          <div>
            Nemáte účet?{" "}
            <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-white hover:text-brand-yellow transition-colors">
              Zaregistrovat se
            </Link>
          </div>
          <div className="text-xs text-gray-600">
            <Link href="/obchodnipodminky" className="hover:text-gray-400">
              Obchodní podmínky a ochrana osobních údajů
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-[#111111]"><Loader2 className="h-8 w-8 animate-spin text-brand-yellow" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
