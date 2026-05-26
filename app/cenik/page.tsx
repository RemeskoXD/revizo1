import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  User,
  Wrench,
  Building2,
  Home,
  Percent,
  Info,
} from 'lucide-react';
import { getPricingDatabase } from '@/lib/pricing-db';
import {
  TECH_SEAT_MONTHLY_CZK,
  TECH_FREE_PER_N,
} from '@/lib/company-pricing';

export const metadata: Metadata = {
  title: 'Ceník | Revizone',
  description:
    'Roční předplatné a doplňkové ceny pro Zákazníky, SVJ, Firmy, Techniky a Realitní makléře.',
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

const formatCzk = (n: number) =>
  `${n.toLocaleString('cs-CZ')} Kč`;

type Plan = {
  id: string;
  title: string;
  description: string;
  yearlyPriceCzk: number;
  icon: React.ReactNode;
  color: string;
  base: string;
  extras: string[];
  ceilingNote?: string;
};

export default async function CenikPage() {
  const pricing = await getPricingDatabase();
  const subs = pricing.subscriptions;
  const addons = pricing.objectAddons;

  const extraPrice = addons.customerExtraObject.yearlyPriceCzk;
  const packagePrice = addons.package10Objects.yearlyPriceCzk;
  const packageLimit = addons.package10Objects.packageLimit;

  const plans: Plan[] = [
    {
      id: 'CUSTOMER',
      title: subs.CUSTOMER.label,
      description: 'Pro majitele rodinných domů a bytů',
      yearlyPriceCzk: subs.CUSTOMER.yearlyPriceCzk,
      icon: <User className="h-6 w-6" />,
      color: 'from-violet-500 to-purple-400',
      base: '1 objekt v základu',
      extras: [
        `Každý další objekt: ${formatCzk(extraPrice)} / rok`,
        'Přehled všech revizí na jednom místě',
        'Automatické hlídání termínů',
        'Snadné objednání revize online',
        'Bezpečné uložení revizních zpráv',
      ],
    },
    {
      id: 'SVJ',
      title: subs.SVJ.label,
      description: 'Pro správce SVJ a bytových domů',
      yearlyPriceCzk: subs.SVJ.yearlyPriceCzk,
      icon: <Home className="h-6 w-6" />,
      color: 'from-emerald-500 to-green-400',
      base: '3 objekty v základu',
      extras: [
        `Rozšíření do ${packageLimit} objektů: ${formatCzk(packagePrice)} / rok`,
        'Společné revizní repozitáře',
        'Pozvánky pro nájemníky a vlastníky',
        'Upozornění na propadlé revize',
      ],
      ceilingNote: `Nad ${packageLimit} objektů – individuální nabídka`,
    },
    {
      id: 'COMPANY_ADMIN',
      title: subs.COMPANY_ADMIN.label,
      description: 'Manažer revizních techniků (FO i PO), který deleguje práci',
      yearlyPriceCzk: subs.COMPANY_ADMIN.yearlyPriceCzk,
      icon: <Building2 className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-400',
      base: '3 objekty v základu',
      extras: [
        `Rozšíření do ${packageLimit} objektů: ${formatCzk(packagePrice)} / rok`,
        `Billing techniků: ${formatCzk(TECH_SEAT_MONTHLY_CZK)} / měsíc / technik (každý ${TECH_FREE_PER_N}. zdarma)`,
        'Správa týmu, přidělování objednávek',
        'Firemní statistiky',
      ],
      ceilingNote: `Nad ${packageLimit} objektů – individuální nabídka`,
    },
    {
      id: 'TECHNICIAN',
      title: subs.TECHNICIAN.label,
      description: 'Pro certifikované revizní techniky',
      yearlyPriceCzk: subs.TECHNICIAN.yearlyPriceCzk,
      icon: <Wrench className="h-6 w-6" />,
      color: 'from-amber-500 to-yellow-400',
      base: 'Bez limitu objektů',
      extras: [
        'Přijímání objednávek na revize',
        'Generování revizních zpráv',
        'Hodnocení od zákazníků',
        'Připojení k firmě přes invite kód',
      ],
    },
    {
      id: 'REALTY',
      title: subs.REALTY.label,
      description: 'Pro realitní makléře a kanceláře',
      yearlyPriceCzk: subs.REALTY.yearlyPriceCzk,
      icon: <Percent className="h-6 w-6" />,
      color: 'from-pink-500 to-rose-400',
      base: 'Portfolio nemovitostí bez limitu',
      extras: [
        'Referral program – 20 Kč za úspěšnou registraci přivedeného zákazníka',
        'Správa portfolia',
        'Sdílení revizí s klienty',
        'Automatické připomínky',
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-[#111] text-gray-200">
      <header className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/login"
            className="flex shrink-0 items-center gap-2 rounded-lg p-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Zpět</span>
          </Link>
          <h1 className="text-base font-bold text-white sm:text-lg">Ceník Revizone</h1>
          <Link
            href="/register"
            className="rounded-lg bg-brand-yellow px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover"
          >
            Registrace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 pb-16 sm:px-6 sm:py-14">
        <p className="mb-2 text-center text-xs uppercase tracking-widest text-brand-yellow/90">
          Transparentní ceny
        </p>
        <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
          Vyberte si plán, který odpovídá vaší roli
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-gray-400 sm:text-base">
          1. měsíc od registrace zdarma, poté roční úhrada přes Stripe. Bez skrytých
          poplatků, doplňky účtujeme zvlášť a transparentně.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 transition-all hover:border-white/25 sm:p-6"
            >
              <div
                className={`inline-flex w-fit items-center justify-center rounded-xl bg-gradient-to-br ${plan.color} p-3 text-white shadow-lg`}
              >
                {plan.icon}
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">{plan.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{plan.description}</p>

              <div className="mt-4">
                <div className="text-3xl font-bold text-white">
                  {plan.yearlyPriceCzk > 0 ? formatCzk(plan.yearlyPriceCzk) : 'Zdarma'}
                </div>
                <div className="mt-0.5 text-xs text-brand-yellow">
                  {plan.yearlyPriceCzk > 0 ? '/ rok · 1. měsíc zdarma' : '· bez ročního poplatku'}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300">
                {plan.base}
              </div>

              <ul className="mt-4 space-y-2 text-sm text-gray-300">
                {plan.extras.map((e) => (
                  <li key={e} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>

              {plan.ceilingNote && (
                <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{plan.ceilingNote}</span>
                </p>
              )}

              <Link
                href="/register"
                className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Začít
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6">
            <h3 className="text-lg font-bold text-white">Doplňky pro objekty</h3>
            <p className="mt-1 text-sm text-gray-400">
              Pokud potřebujete více objektů, než kolik je v základu:
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-300">
              <li>
                <strong className="text-white">Další objekt (Zákazník):</strong>{' '}
                {formatCzk(extraPrice)} / rok / objekt – platí se ročně, lze kdykoli zrušit.
              </li>
              <li>
                <strong className="text-white">Balíček do {packageLimit} objektů (SVJ / Firma):</strong>{' '}
                {formatCzk(packagePrice)} / rok – plochá cena za rozšíření z 3 na {packageLimit}.
              </li>
              <li>
                <strong className="text-white">Nad {packageLimit} objektů:</strong> individuální nabídka
                – kontaktujte nás na{' '}
                <a href="mailto:info@revizone.cz" className="text-brand-yellow hover:underline">
                  info@revizone.cz
                </a>
                .
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6">
            <h3 className="text-lg font-bold text-white">Měsíční billing techniků</h3>
            <p className="mt-1 text-sm text-gray-400">
              Pro firmy s vlastním týmem techniků – objednávky se přidělují jejich kapacitě.
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-white">{formatCzk(TECH_SEAT_MONTHLY_CZK)}</div>
              <div className="mt-0.5 text-xs text-gray-400">
                / měsíc / aktivní technik
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Každý <strong className="text-gray-300">{TECH_FREE_PER_N}. technik zdarma</strong> – sleva se
              vypočítá automaticky.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Počet techniků</th>
                    <th className="px-3 py-2">Účtováno</th>
                    <th className="px-3 py-2 text-right">Měsíčně</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-200">
                  {[1, 5, 10, 20, 100].map((n) => {
                    const billable = n - Math.floor(n / TECH_FREE_PER_N);
                    return (
                      <tr key={n}>
                        <td className="px-3 py-2">{n}</td>
                        <td className="px-3 py-2">{billable}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCzk(billable * TECH_SEAT_MONTHLY_CZK)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="mt-14 text-center text-sm text-gray-500">
          <p>
            Otázky k cenám?{' '}
            <a href="mailto:info@revizone.cz" className="text-brand-yellow hover:underline">
              info@revizone.cz
            </a>{' '}
            ·{' '}
            <Link href="/obchodnipodminky" className="text-brand-yellow hover:underline">
              Obchodní podmínky
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
