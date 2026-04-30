import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { checkDatabaseSchema } from "@/lib/dbSchemaCheck";

export default async function DatabaseTestPage() {
  const session = await getServerSession(authOptions);

  // Security: show only to admins/support (so customers can't inspect DB structure).
  const role = session?.user?.role;
  if (!session || !["ADMIN", "SUPPORT"].includes(role as string)) {
    redirect("/login");
  }

  const report = await checkDatabaseSchema();

  const missingColsTotal = Object.values(report.missingColumnsByTable).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const schemaDrift =
    report.missingTables.length > 0 ||
    missingColsTotal > 0 ||
    report.migrationSync.pendingMigrations.length > 0 ||
    !report.migrationSync.migrationsTableExists;

  const checklist: string[] = [];
  if (!report.migrationSync.migrationsTableExists) {
    checklist.push('Spustit prisma migrate deploy (chybí _prisma_migrations).');
  }
  if (report.migrationSync.pendingMigrations.length > 0) {
    checklist.push(
      `Nasadit migrace: ${report.migrationSync.pendingMigrations.join(', ')}`
    );
  }
  checklist.push(
    ...report.missingTables.map((t) => `Vytvořit tabulku: ${t}`),
    ...Object.entries(report.missingColumnsByTable).map(
      ([t, cols]) => `Tabulka ${t}: sloupce ${cols.join(', ')}`
    )
  );
  if (checklist.length === 0) checklist.push('Schéma odpovídá prisma/schema.prisma a migrace jsou v pořádku.');

  return (
    <main className="min-h-screen p-6 bg-[#111111] text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Diagnostika databáze (admin)</h1>
          <p className="mt-1 text-sm text-gray-400">
            Porovnání MySQL s <code className="text-gray-300">prisma/schema.prisma</code> ·{' '}
            <span className={schemaDrift ? 'text-amber-400' : 'text-green-400'}>
              {schemaDrift ? 'Jsou rozdíly – viz níže' : 'Bez rozdílů'}
            </span>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
            <p className="text-gray-500">Databáze</p>
            <p className="font-mono text-white">{report.databaseName ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
            <p className="text-gray-500">Modely / tabulky v DB</p>
            <p className="text-white">
              {report.expectedModelsCount} očekáváno · {report.existingTablesCount} názvů v DB
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
            <p className="text-gray-500">Migrace (repo → DB)</p>
            <p className="text-white">
              {report.migrationSync.migrationsTableExists
                ? `Čeká: ${report.migrationSync.pendingMigrations.length}`
                : 'Bez _prisma_migrations'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
            <p className="text-gray-500">Chybí tabulky / sloupce</p>
            <p className="text-white">
              {report.missingTables.length} / {missingColsTotal}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-brand-yellow/20 bg-brand-yellow/5 p-5">
          <h2 className="font-semibold text-white">Co doplnit</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-300">
            {checklist.map((c, i) => (
              <li key={i} className="whitespace-pre-wrap">
                {c}
              </li>
            ))}
          </ol>
          {report.alterHints.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-400">Orientační ALTER (preferujte migrate deploy)</p>
              <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-gray-300">
                {report.alterHints.join('\n')}
              </pre>
            </div>
          )}
        </div>

        <details className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-400">
            Celý strojový výstup (JSON)
          </summary>
          <pre className="mt-4 max-h-[480px] overflow-auto text-xs whitespace-pre-wrap text-gray-400">
            {JSON.stringify(report, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  );
}

