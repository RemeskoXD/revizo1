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
  Check,
  User,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { SUBSCRIPTION_PLANS, SubscriptionPlanKey } from "@/lib/subscription-pricing";

type Package = {
  id: string;
  role: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  benefits: string[];
  color: string;
  yearlyPriceCzk: number;
};

function getPackagesWithPrices(plans: typeof SUBSCRIPTION_PLANS): Package[] {
  return [
    {
      id: "customer",
      role: "CUSTOMER",
      title: plans.CUSTOMER.label || "Zákazník",
      yearlyPriceCzk: plans.CUSTOMER.yearlyPriceCzk,
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
      title: plans.TECHNICIAN.label || "Technik",
      yearlyPriceCzk: plans.TECHNICIAN.yearlyPriceCzk,
      icon: <Wrench className="w-7 h-7" />,
      description: "Pro certifikované revizní techniky",
      benefits: [
        "Přijímejte objednávky na revize",
        "Správa vlastního kalendáře",
        "Generování revizních zpráv",
        "Hodnocení od zákazníků",
        "Možnost připojení k firmě kódem",
      ],
      color: "from-amber-500 to-yellow-400",
    },
    {
      id: "company",
      role: "COMPANY_ADMIN",
      title: plans.COMPANY_ADMIN.label || "Firma",
      // If we made COMPANY_ADMIN dynamic, map it accordingly
      yearlyPriceCzk: plans.COMPANY_ADMIN.yearlyPriceCzk,
      icon: <Building2 className="w-7 h-7" />,
      description: "Pro firmy s více techniky",
      benefits: [
        "Správa týmu techniků",
        "Přehled všech zakázek firmy",
        "Přidělování objednávek",
        "Firemní statistiky",
        "Zvací kód pro techniky po schválení",
      ],
      color: "from-blue-500 to-cyan-400",
    },
  ];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/login";
  const callbackUrl = rawCallback.startsWith("/api") ? "/dashboard" : rawCallback;
  const inviteCode = searchParams.get("invite");
  
  const [packages, setPackages] = useState<Package[]>(() => getPackagesWithPrices(SUBSCRIPTION_PLANS));

  useEffect(() => {
    if (inviteCode) {
      const q = searchParams.toString();
      router.replace(q ? `/registertest?${q}` : "/registertest");
    }
  }, [inviteCode, router, searchParams]);
  
  useEffect(() => {
     fetch('/api/pricing').then(r => r.json()).then(data => {
        if (data.subscriptions) {
           setPackages(getPackagesWithPrices(data.subscriptions));
        }
     }).catch(() => {});
  }, []);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ico, setIco] = useState("");
  const [companyInviteCode, setCompanyInviteCode] = useState("");
  const [expectedTechnicians, setExpectedTechnicians] = useState("");
  const [licenseFileName, setLicenseFileName] = useState("");
  const [licenseDataUrl, setLicenseDataUrl] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [donePending, setDonePending] = useState(false);

  const role = selectedPackage?.role || "";

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setStep(2);
    setError("");
    setLicenseDataUrl("");
    setLicenseFileName("");
  };

  const handleBack = () => {
    setStep(1);
    setError("");
    setDonePending(false);
  };

  const onLicenseChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setLicenseDataUrl("");
      setLicenseFileName("");
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setError("Soubor je příliš velký (max. 4 MB).");
      return;
    }
    setError("");
    setLicenseFileName(f.name);
    try {
      const url = await readFileAsDataUrl(f);
      setLicenseDataUrl(url);
    } catch {
      setError("Soubor se nepodařilo načíst.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if ((role === "TECHNICIAN" || role === "COMPANY_ADMIN") && !licenseDataUrl.trim()) {
        setError("Nahrajte soubor s oprávněním (PDF nebo obrázek).");
        setLoading(false);
        return;
      }

      const base = {
        email,
        password,
        role,
      };

      let body: Record<string, unknown> = { ...base };

      if (role === "CUSTOMER") {
        body = {
          ...base,
          name,
          phone,
          address,
        };
      } else if (role === "TECHNICIAN") {
        body = {
          ...base,
          name: name.trim() || undefined,
          phone,
          address,
          ico: ico.trim() || undefined,
          companyInviteCode: companyInviteCode.trim() || undefined,
          licenseDocument: licenseDataUrl,
        };
      } else if (role === "COMPANY_ADMIN") {
        const exp = expectedTechnicians.trim();
        body = {
          ...base,
          name: name.trim() || undefined,
          phone,
          address,
          ico: ico.trim() || undefined,
          companyInviteCode: companyInviteCode.trim() || undefined,
          licenseDocument: licenseDataUrl,
          expectedTechnicians: exp === "" ? null : parseInt(exp, 10),
        };
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.user?.pendingApproval) {
          setDonePending(true);
        } else if (role === "CUSTOMER") {
          const redirectTo =
            typeof data.postRegisterRedirect === "string" && data.postRegisterRedirect.startsWith("/")
              ? data.postRegisterRedirect
              : "/dashboard";
          const signed = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });
          if (signed?.ok) {
            router.refresh();
            router.push(redirectTo);
          } else {
            router.push(`/login?callbackUrl=${encodeURIComponent(redirectTo)}`);
          }
        } else {
          router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        }
      } else {
        setError(data.message || "Došlo k chybě při registraci");
      }
    } catch {
      setError("Došlo k chybě při registraci");
    } finally {
      setLoading(false);
    }
  };

  if (inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-yellow" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-[#111111] px-3 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(800px,140vw)] w-[min(800px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-yellow/5 blur-3xl" />

      <>
        {step === 1 ? (
          <div
            key="step-1"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 w-full max-w-5xl"
          >
            <div className="flex justify-center mb-6">
              <div className="relative flex items-center justify-center w-12 h-12 bg-brand-yellow rounded-xl shadow-lg shadow-brand-yellow/20">
                <ShieldCheck className="w-7 h-7 text-black" />
              </div>
            </div>

            <h1 className="text-center text-2xl font-bold text-white sm:text-3xl mb-2 px-1">
              Vytvořte si účet
            </h1>
            <p className="text-gray-400 text-center text-sm mb-8 sm:mb-10 px-1">
              Vyberte typ účtu – 1. měsíc zdarma, poté roční předplatné. U technika a firmy je registrace s ověřením
              oprávnění.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {packages.map((pkg, i) => (
                <button
                  key={pkg.id}
                  type="button"
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
                  <p className="text-gray-400 text-sm mb-5">{pkg.description}</p>

                  <p className="mb-4 text-sm font-medium text-white">
                    {pkg.yearlyPriceCzk.toLocaleString("cs-CZ")} Kč / rok
                    <span className="ml-2 text-xs font-normal text-brand-yellow">1. měsíc zdarma</span>
                  </p>

                  <ul className="space-y-2.5 mb-6">
                    {pkg.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-brand-yellow mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-yellow opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    Pokračovat
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 space-y-3 text-center text-sm text-gray-500 px-1">
              <div>
                Již máte účet?{" "}
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="text-white hover:text-brand-yellow transition-colors"
                >
                  Přihlásit se
                </Link>
              </div>
              <div>
                <Link
                  href={`/registertest?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="text-gray-400 hover:text-brand-yellow transition-colors leading-relaxed"
                >
                  Další typy účtů (SVJ, realitní makléř, …)
                </Link>
              </div>
              <div className="text-xs text-gray-600">
                <Link href="/obchodnipodminky" className="hover:text-gray-400">
                  Obchodní podmínky a ochrana osobních údajů
                </Link>
              </div>
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

            {selectedPackage && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${selectedPackage.color} text-white`}
                >
                  {selectedPackage.icon}
                </div>
                <span className="text-sm font-medium text-gray-300">{selectedPackage.title}</span>
              </div>
            )}

            <h1 className="text-2xl font-bold text-white text-center mb-2">
              {donePending ? "Žádost odeslána" : "Dokončení registrace"}
            </h1>
            <p className="text-gray-400 text-center text-sm mb-8">
              {donePending
                ? "Po schválení administrátorem vám přijde e-mail. Po přihlášení dokončíte roční předplatné (testovací platba)."
                : role === "CUSTOMER"
                  ? "Vyplňte údaje – účet vznikne ihned, poté přejdete k předplatnému."
                  : "Vyplňte údaje a nahrajte oprávnění. Účet se aktivuje po schválení."}
            </p>

            {donePending ? (
              <div className="space-y-4 text-center">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-yellow text-black font-bold hover:bg-brand-yellow-hover transition-colors"
                >
                  Přejít na přihlášení
                </Link>
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm text-gray-500 hover:text-white"
                >
                  Zpět na výběr účtu
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {role === "CUSTOMER" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Celé jméno</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                          placeholder="Jan Novák"
                          required
                        />
                      </div>
                    </>
                  )}

                  {(role === "TECHNICIAN" || role === "COMPANY_ADMIN") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Jméno / kontaktní osoba
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                        placeholder="Jan Novák"
                      />
                      <p className="text-xs text-gray-600 mt-1">Doporučeno pro komunikaci s administrací.</p>
                    </div>
                  )}

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

                  {(role === "TECHNICIAN" || role === "COMPANY_ADMIN") && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">IČO (nepovinné)</label>
                        <input
                          type="text"
                          value={ico}
                          onChange={(e) => setIco(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                          placeholder="12345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Kód firmy (nepovinné)
                        </label>
                        <input
                          type="text"
                          value={companyInviteCode}
                          onChange={(e) => setCompanyInviteCode(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                          placeholder="např. kód od vaší firmy v systému"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Pro napojení k existující firmě po schválení (stejný kód jako ve firmě).
                        </p>
                      </div>
                    </>
                  )}

                  {(role === "CUSTOMER" || role === "TECHNICIAN" || role === "COMPANY_ADMIN") && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Telefon</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                          placeholder="+420 …"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Adresa</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                          placeholder="Ulice, město, PSČ"
                          required
                        />
                      </div>
                    </>
                  )}

                  {role === "COMPANY_ADMIN" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Plánovaný počet techniků (nepovinné)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        value={expectedTechnicians}
                        onChange={(e) => setExpectedTechnicians(e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                        placeholder="např. 5"
                      />
                    </div>
                  )}

                  {(role === "TECHNICIAN" || role === "COMPANY_ADMIN") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Oprávnění k provádění revizí (PDF nebo obrázek)
                      </label>
                      <input
                        type="file"
                        required
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={onLicenseChange}
                        className="w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
                      />
                      {licenseFileName && (
                        <p className="text-xs text-brand-yellow mt-1">Vybráno: {licenseFileName}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">Max. 4 MB. Účet bude aktivní až po schválení.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Heslo</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={10}
                    />
                    <p className="text-xs text-gray-600 mt-1">Minimálně 10 znaků.</p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/25 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Zpět
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : role === "CUSTOMER" ? (
                        "Vytvořit účet"
                      ) : (
                        "Odeslat ke schválení"
                      )}
                      {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
              </>
            )}

            {!donePending && (
              <div className="mt-6 space-y-3 text-center text-sm text-gray-500">
                <div>
                  Již máte účet?{" "}
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="text-white hover:text-brand-yellow transition-colors"
                  >
                    Přihlásit se
                  </Link>
                </div>
                <div className="text-xs text-gray-600">
                  <Link href="/obchodnipodminky" className="hover:text-gray-400">
                    Obchodní podmínky a ochrana osobních údajů
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    </div>
  );
}

export default function RegisterPage() {
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
