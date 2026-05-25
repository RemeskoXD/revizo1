"use client";

import { useEffect } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { isPublicPathname } from "@/lib/public-routes";
import { Clock, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import { RevizoneRoleChrome } from "@/components/RevizoneRoleChrome";

const ROLE_NAMES: Record<string, string> = {
  COMPANY_ADMIN: "Firma / Manažer",
  TECHNICIAN: "Revizní technik",
  SVJ: "SVJ / Bytový dům",
  REALTY: "Realitní makléř",
  CUSTOMER: "Zákazník",
  ADMIN: "Administrátor",
  SUPPORT: "Podpora",
  CONTRACTOR: "Dodavatel",
  PENDING_SUPPORT: "Aspirant podpory",
  PENDING_CONTRACTOR: "Aspirant dodavatele",
};

function SessionAuthGuards() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.blocked) {
      void signOut({ callbackUrl: "/login?error=blocked" });
      return;
    }
    if (session?.user?.revisionAuthExpired && !session?.user?.pendingApproval) {
      void signOut({ callbackUrl: "/login?error=revision_auth" });
    }
  }, [session?.user?.blocked, session?.user?.revisionAuthExpired, session?.user?.pendingApproval, status]);

  return null;
}

function PendingApprovalGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          <p className="text-gray-400 font-medium text-sm">Načítání...</p>
        </div>
      </div>
    );
  }

  const isPending = session?.user?.pendingApproval;
  const isPublic = isPublicPathname(pathname || "") || pathname === "/";

  if (isPending && !isPublic) {
    const roleLabel = ROLE_NAMES[session?.user?.role || ""] || session?.user?.role || "Uživatel";
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
          
          {/* Animated clock / pending icon */}
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-6 relative animate-pulse">
            <Clock className="w-8 h-8 text-amber-500" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
            Čeká se na schválení administrátorem
          </h1>
          <p className="text-sm text-gray-400 mb-6 max-w-sm">
            Váš profil <span className="text-amber-400 font-semibold">{roleLabel}</span> byl úspěšně zaregistrován. Pro zpřístupnění celého systému nyní naši administrátoři ověřují vaše oprávnění a podklady.
          </p>

          {/* Stepper / Status Indicator */}
          <div className="w-full bg-[#1b1b1b]/50 border border-white/5 rounded-xl p-5 mb-8 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">1. Registrace a doložení dokumentace</h3>
                <p className="text-[11px] text-gray-500">Profil a soubory úspěšně uloženy</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">2. Kontrola administrátorem</h3>
                <p className="text-[11px] text-amber-400/80">Dokumenty jsou ve frontě ke kontrole a ověření</p>
              </div>
            </div>

            <div className="flex items-start gap-3 opacity-40">
              <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">3. Aktivace funkcí</h3>
                <p className="text-[11px] text-gray-500">Zašleme vám e-mail jakmile bude hotovo</p>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <div className="bg-[#1b1b1b] rounded-xl p-4 border border-white/5 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Nemusíte nic dál podnikat. O průběhu schválení Vás budeme obratem informovat e-mailem. V případě dotazů se obraťte na podporu.
              </p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-4 w-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl py-3 px-4 font-medium text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Odhlásit se
            </button>
          </div>

        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionAuthGuards />
      <PendingApprovalGuard>
        <RevizoneRoleChrome />
        {children}
      </PendingApprovalGuard>
    </SessionProvider>
  );
}
