"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Wrench,
  Building2,
  Home,
  Check,
  User,
  Building,
} from "lucide-react";


type Package = {
  id: string;
  role: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  benefits: string[];
  color: string;
};

const packages: Package[] = [
  {
    id: "customer",
    role: "CUSTOMER",
    title: "Zákazník",
    icon: <User className="w-7 h-7" />,
    description: "Pro majitele rodinných domů",
    benefits: [
      "Přehled všech vašich revizí na jednom místě",
      "Automatické hlídání termínů a upozornění",
      "Snadné objednání nové revize online",
      "Bezpečné uložení revizních zpráv",
      "Sdílení dokumentace jedním klikem",
    ],
    color: "from-violet-500 to-purple-400",
  },
  {
    id: "technician",
    role: "TECHNICIAN",
    title: "Technik",
    icon: <Wrench className="w-7 h-7" />,
    description: "Pro certifikované revizní techniky",
    benefits: [
      "Přijímejte objednávky na revize",
      "Správa vlastního kalendáře",
      "Generování revizních zpráv",
      "Hodnocení od zákazníků",
      "Možnost připojení k firmě",
    ],
    color: "from-amber-500 to-yellow-400",
  },
  {
    id: "company",
    role: "COMPANY_ADMIN",
    title: "Firma",
    icon: <Building2 className="w-7 h-7" />,
    description: "Pro firmy s více techniky",
    benefits: [
      "Správa týmu techniků",
      "Přehled všech zakázek firmy",
      "Přidělování objednávek technikům",
      "Firemní statistiky a reporty",
      "Zvací kód pro zaměstnance",
    ],
    color: "from-blue-500 to-cyan-400",
  },
  {
    id: "realty",
    role: "REALTY",
    title: "Realitní makléř",
    icon: <Home className="w-7 h-7" />,
    description: "Pro realitní kanceláře a makléře",
    benefits: [
      "Objednávky revizí pro klienty",
      "Správa nemovitostí v portfoliu",
      "Přenos dokumentace na nové majitele",
      "Přehled o stavu revizí",
      "Sdílení zpráv s klienty",
    ],
    color: "from-emerald-500 to-green-400",
  },
  {
    id: "svj",
    role: "SVJ",
    title: "SVJ",
    icon: <Building className="w-7 h-7" />,
    description: "Pro správu bytových domů",
    benefits: [
      "Správa revizí pro celý bytový dům",
      "Přehled stavu revizí společných prostor",
      "Automatické upozornění na blížící se termíny",
      "Hromadné objednávání revizí",
      "Dokumentace a zprávy na jednom místě",
    ],
    color: "from-rose-500 to-pink-400",
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/login";
  const callbackUrl = rawCallback.startsWith("/api") ? "/dashboard" : rawCallback;
  const inviteCode = searchParams.get("invite");

  const [step, setStep] = useState<1 | 2>(inviteCode ? 2 : 1);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(inviteCode ? "PENDING_SUPPORT" : "");
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string | null }[]>([]);

  useEffect(() => {
    if (role === "TECHNICIAN") {
      fetch("/api/public/companies")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCompanies(data);
          }
        })
        .catch((err) => console.error("Failed to load companies", err));
    }
  }, [role]);

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setRole(pkg.role);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          companyId: role === "TECHNICIAN" ? companyId : undefined,
          inviteCode,
          registrationFlow: "legacy",
        }),
      });

      if (res.ok) {
        if (inviteCode) {
          router.push(
            `/login?message=${encodeURIComponent("Registrace byla úspěšná. Nyní vyčkejte na schválení administrátorem.")}`
          );
        } else {
          router.push(
            `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
          );
        }
      } else {
        const data = await res.json();
        setError(data.message || "Došlo k chybě při registraci");
      }
    } catch {
      setError("Došlo k chybě při registraci");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-[#111111] px-3 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(800px,140vw)] w-[min(800px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-yellow/5 blur-3xl" />

      <p className="relative z-10 mb-2 max-w-xl px-2 text-center text-[10px] uppercase tracking-wider text-brand-yellow/90 sm:text-xs">
        Testovací registrace – všechny typy účtů a pozvánky
      </p>

      <>
        {step === 1 && !inviteCode ? (
          <div
            key="step-1"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 w-full max-w-5xl"
          >
            <div className="flex justify-center mb-6">
              <div className="relative flex items-center justify-center w-12 h-12 bg-brand-yellow rounded-xl shadow-lg shadow-brand-yellow/20">
                <ShieldCheck className="w-7 h-7 text-black" />
              </div>
            </div>

            <h1 className="mb-2 px-1 text-center text-2xl font-bold text-white sm:text-3xl">
              Vyberte si balíček
            </h1>
            <p className="mb-8 text-center text-sm text-gray-400 sm:mb-10 px-1">
              Zvolte typ účtu, který nejlépe odpovídá vašim potřebám
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {packages.map((pkg, i) => (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className="group relative rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 text-left transition-all duration-300 hover:border-white/25 hover:shadow-2xl hover:-translate-y-1 focus:border-brand-yellow/50 focus:outline-none sm:p-6 active:scale-[0.99]"
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.color} text-white mb-4 shadow-lg`}
                  >
                    {pkg.icon}
                  </div>

                  <h2 className="text-xl font-bold text-white mb-1 group-hover:text-brand-yellow transition-colors">
                    {pkg.title}
                  </h2>
                  <p className="text-gray-400 text-sm mb-5">
                    {pkg.description}
                  </p>

                  <ul className="space-y-2.5 mb-6">
                    {pkg.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2.5 text-sm text-gray-300"
                      >
                        <Check className="w-4 h-4 text-brand-yellow mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-yellow opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    Vybrat balíček
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              Již máte účet?{" "}
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-white hover:text-brand-yellow transition-colors"
              >
                Přihlásit se
              </Link>
              {" · "}
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-gray-400 hover:text-brand-yellow transition-colors"
              >
                Veřejná beta registrace
              </Link>
            </div>
          </div>
        ) : (
          <div
            key="step-2"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 shadow-2xl sm:p-8"
          >
            <div className="flex justify-center mb-6">
              <div className="relative flex items-center justify-center w-12 h-12 bg-brand-yellow rounded-xl shadow-lg shadow-brand-yellow/20">
                <ShieldCheck className="w-7 h-7 text-black" />
              </div>
            </div>

            {selectedPackage && !inviteCode && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${selectedPackage.color} text-white`}
                >
                  {selectedPackage.icon}
                </div>
                <span className="text-sm font-medium text-gray-300">
                  {selectedPackage.title}
                </span>
              </div>
            )}

            <h1 className="text-2xl font-bold text-white text-center mb-2">
              {inviteCode ? "Připojit se k týmu" : "Vytvořte si účet"}
            </h1>
            <p className="text-gray-400 text-center text-sm mb-8">
              {inviteCode
                ? "Vytvořte si účet zaměstnance"
                : "Vyplňte své údaje pro dokončení registrace"}
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Jméno a příjmení
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                  placeholder="Jan Novák"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  E-mail
                </label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Heslo
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              {inviteCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Typ účtu
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-yellow/50 transition-colors"
                  >
                    <option value="PENDING_SUPPORT">Podpora</option>
                    <option value="PENDING_CONTRACTOR">Zhotovitel</option>
                  </select>
                </div>
              )}

              {role === "TECHNICIAN" && !inviteCode && (
                <div className="overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-gray-300 mb-1 mt-2">
                    Připojit se k firmě (volitelné)
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-yellow/50 transition-colors"
                  >
                    <option value="">-- Bez firmy --</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name || "Firma"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Pokud vyberete firmu, bude jí odeslána žádost o připojení.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {!inviteCode && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/25 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Zpět
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Zaregistrovat se"
                  )}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Již máte účet?{" "}
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-white hover:text-brand-yellow transition-colors"
              >
                Přihlásit se
              </Link>
            </div>
          </div>
        )}
      </>
    </div>
  );
}

export default function RegisterTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#111111]">
          <Loader2 className="w-8 h-8 animate-spin text-brand-yellow" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
