import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import SettingsRefreshButton from './SettingsRefreshButton';

export default function SettingsDbError({
  message,
  title = 'Nastavení se nepodařilo načíst',
}: {
  message?: string;
  title?: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center text-gray-200">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          Nejčastěji jde o <strong className="text-white">neúplné schéma databáze</strong> (chybějící tabulky nebo sloupce po
          nasazení nové verze). Na serveru spusťte migrace a obnovte stránku.
        </p>
        {message && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-amber-200/90">
            {message}
          </pre>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/test/health"
            className="rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-black hover:bg-brand-yellow-hover"
          >
            Diagnostika databáze
          </Link>
          <SettingsRefreshButton />
        </div>
        <p className="mt-6 text-xs text-gray-500">
          Příkaz na serveru: <code className="rounded bg-black/30 px-1.5 py-0.5">npx prisma migrate deploy</code>
        </p>
      </div>
    </div>
  );
}
