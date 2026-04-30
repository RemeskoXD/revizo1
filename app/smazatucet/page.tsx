import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { SmazatUcetClient } from './SmazatUcetClient';

export const metadata: Metadata = {
  title: 'Smazání účtu | Revizone',
  description:
    'Postup pro smazání účtu v aplikaci Revizone. Požadavek Google Play na informace o mazání účtu a uchovávání dat.',
  robots: { index: true, follow: true },
};

export default function SmazatUcetPage() {
  return (
    <div className="min-h-dvh bg-[#111111] text-gray-200">
      <div className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg p-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Domů</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <Trash2 className="h-5 w-5 shrink-0 text-brand-yellow" />
            <h1 className="truncate text-base font-bold text-white sm:text-lg">Smazání účtu – Revizone</h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-16 sm:px-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-brand-yellow/90">Účet a ochrana údajů</p>

        <div className="mb-10 space-y-4 text-sm leading-relaxed text-gray-300">
          <p>
            Tato stránka odpovídá požadavkům obchodu{' '}
            <strong className="text-white">Google Play</strong> na jasný postup pro smazání účtu a informace o tom, která
            data se mažou, která mohou případně zůstat uložena a po jakou dobu.
          </p>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-medium text-white">Vydavatel aplikace (záznam v obchodu Google Play)</p>
            <p className="mt-1">Ludvík Remešek</p>
            <p className="mt-3 font-medium text-white">Poskytovatel služeb</p>
            <p className="mt-1">ASPERSUN, s.r.o.</p>
            <p className="mt-2 text-xs text-gray-500">
              Název aplikace v obchodu: <strong className="text-gray-400">Revizone</strong> — tato stránka je věnována
              stejné aplikaci a vývojáři uvedenému v záznamu v obchodu.
            </p>
          </div>

          <h2 className="pt-4 text-lg font-bold text-white">Jak požádat o smazání účtu</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Přihlaste se do aplikace Revizone (web nebo mobilní klient / PWA), případně použijte formulář níže na této
              stránce po přihlášení.
            </li>
            <li>
              Odešlete <strong className="text-white">žádost o smazání účtu</strong>. Z bezpečnostních důvodů je nutné zadat
              <strong className="text-white"> heslo</strong> k účtu.
            </li>
            <li>
              Žádost je předána do <strong className="text-white">administrace</strong> k <strong className="text-white">schválení</strong>. Po schválení je účet označen jako smazaný a přihlášení již není možné.
            </li>
            <li>
              Alternativně můžete žádost zahájit také v <strong className="text-white">Nastavení → Osobní údaje</strong> v aplikaci (sekce smazání účtu).
            </li>
          </ol>

          <h2 className="pt-4 text-lg font-bold text-white">Jaká data se smaží nebo omezí</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Po <strong className="text-white">schválení smazání</strong> je účet <strong className="text-white">deaktivován</strong> (nemůžete se přihlásit). Přístup k osobním údajům v rámci účtu je ukončen.
            </li>
            <li>
              Údaje, které je nutné uchovat podle <strong className="text-white">právních předpisů</strong> (např. účetní a daňové doklady, evidence související s objednávkami), mohou být uchovány po dobu stanovenou zákonem, a to v nezbytném rozsahu (např. fakturační údaje u dokončených objednávek).
            </li>
            <li>
              <strong className="text-white">Obsahové údaje</strong> v systému (např. historie objednávek, zprávy u zakázek) mohou být po schválení smazání buď anonymizovány, nebo ponechány v nezbytném rozsahu pro plnění zákonných povinností a obranu práv — vždy v souladu s dokumentací zpracování osobních údajů.
            </li>
            <li>
              Doba dalšího uchování závisí na typu dokumentu a právní úpravě; obvykle se jedná o řád <strong className="text-white">let</strong> u účetnictví, kratší dobu u provozních logů.
            </li>
          </ul>

          <h2 className="pt-4 text-lg font-bold text-white">GDPR a vaše práva</h2>
          <p>
            Podrobnosti o zpracování osobních údajů, včetně práv přístupu, opravy, výmazu a stížnosti u ÚOOÚ, jsou uvedeny
            na stránce{' '}
            <Link href="/obchodnipodminky" className="text-brand-yellow hover:underline">
              Obchodní podmínky a ochrana osobních údajů
            </Link>
            .
          </p>
        </div>

        <SmazatUcetClient />

        <p className="mt-10 text-center text-sm text-gray-600">
          <Link href="/obchodnipodminky" className="hover:text-gray-400">
            Obchodní podmínky
          </Link>
          {' · '}
          <Link href="/login" className="hover:text-gray-400">
            Přihlášení
          </Link>
        </p>
      </main>
    </div>
  );
}
