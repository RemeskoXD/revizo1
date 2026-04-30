'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Database, Server, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type CheckResult = {
  name: string;
  status: 'ok' | 'error' | 'missing';
  message: string;
  details?: string;
};

type MinimalResponse = {
  mode: 'minimal';
  status: string;
  database: string;
  message?: string;
  hint?: string;
};

type SchemaReport = {
  databaseName: string | null;
  checkedAt: string;
  missingTables: string[];
  missingColumnsByTable: Record<string, string[]>;
  extraTablesInDb: string[];
  extraColumnsByTable: Record<string, string[]>;
  pendingMigrations: string[];
  appliedMigrationsCount: number;
  migrationsTableExists: boolean;
  alterHintsSql: string[];
  checklist: string[];
};

type DetailedResponse = {
  mode: 'detailed';
  results: CheckResult[];
  summary: { ok: number; error: number; missing: number };
  schema: SchemaReport | null;
  schemaLoadError?: string;
};

export default function HealthCheckPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [summary, setSummary] = useState<{ ok: number; error: number; missing: number } | null>(null);
  const [schemaReport, setSchemaReport] = useState<SchemaReport | null>(null);
  const [schemaLoadError, setSchemaLoadError] = useState<string | null>(null);
  const [minimal, setMinimal] = useState<MinimalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [detailToken, setDetailToken] = useState('');

  const runCheck = async () => {
    setLoading(true);
    setMinimal(null);
    try {
      const headers: HeadersInit = {};
      const t = detailToken.trim();
      if (t) headers.Authorization = `Bearer ${t}`;

      const res = await fetch('/api/health', { headers, cache: 'no-store' });
      const data = (await res.json()) as MinimalResponse | DetailedResponse;

      if (data.mode === 'minimal') {
        setMinimal(data);
        setResults([]);
        setSummary(null);
        setSchemaReport(null);
        setSchemaLoadError(null);
      } else {
        const d = data as DetailedResponse;
        setMinimal(null);
        setResults(d.results ?? []);
        setSummary(d.summary ?? null);
        setSchemaReport(d.schema ?? null);
        setSchemaLoadError(d.schemaLoadError ?? null);
      }
      setLastCheck(new Date().toLocaleString('cs-CZ'));
    } catch (e) {
      setResults([{ name: 'API Health', status: 'error', message: 'Nepodařilo se spojit s API', details: String(e) }]);
      setSummary({ ok: 0, error: 1, missing: 0 });
      setSchemaReport(null);
      setSchemaLoadError(null);
      setMinimal(null);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
    return <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-[#111] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-brand-yellow shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">Diagnostika databáze</h1>
              <p className="text-gray-400 text-sm">
                Veřejně je jen rychlá kontrola připojení. Úplná kontrola schématu vyžaduje tajný klíč z prostředí
                (HEALTH_CHECK_SECRET nebo CRON_SECRET).
              </p>
            </div>
          </div>
          <button
            onClick={runCheck}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            {loading ? 'Kontroluji...' : 'Spustit kontrolu'}
          </button>
        </div>

        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <KeyRound className="w-4 h-4 text-brand-yellow" />
            <span>Volitelný klíč pro úplnou diagnostiku (stejná hodnota jako v Coolify u CRON_SECRET / HEALTH_CHECK_SECRET)</span>
          </div>
          <input
            type="password"
            value={detailToken}
            onChange={(e) => setDetailToken(e.target.value)}
            autoComplete="off"
            placeholder="Nechte prázdné = jen rychlá kontrola DB"
            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-yellow/50"
          />
        </div>

        {minimal && (
          <div
            className={cn(
              'rounded-xl border p-6 flex items-start gap-3',
              minimal.database === 'connected'
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            )}
          >
            {minimal.database === 'connected' ? (
              <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500 shrink-0" />
            )}
            <div>
              <h2 className="font-bold text-white">Rychlá kontrola</h2>
              <p className="text-sm text-gray-300 mt-1">
                Databáze: <strong>{minimal.database === 'connected' ? 'připojeno' : 'nepřipojeno'}</strong>
              </p>
              {minimal.message && <p className="text-sm text-red-300 mt-2">{minimal.message}</p>}
              {minimal.hint && <p className="text-xs text-gray-500 mt-3">{minimal.hint}</p>}
            </div>
          </div>
        )}

        {schemaLoadError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <p className="font-semibold text-red-400">Chyba načtení schématu</p>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs opacity-90">{schemaLoadError}</pre>
          </div>
        )}

        {schemaReport && (
          <div className="space-y-4 rounded-xl border border-brand-yellow/25 bg-brand-yellow/5 p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Database className="h-5 w-5 text-brand-yellow" />
              Co doplnit do databáze (vs. prisma/schema.prisma)
            </h2>
            <p className="text-xs text-gray-400">
              Databáze: <strong className="text-gray-300">{schemaReport.databaseName ?? '—'}</strong>
              {' · '}
              Kontrola: {new Date(schemaReport.checkedAt).toLocaleString('cs-CZ')}
              {' · '}
              Migrace v DB:{' '}
              {schemaReport.migrationsTableExists
                ? `${schemaReport.appliedMigrationsCount} záznamů v _prisma_migrations`
                : 'tabulka _prisma_migrations chybí'}
            </p>

            {schemaReport.pendingMigrations.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm font-semibold text-red-300">Neaplikované migrace (složky v repozitáři)</p>
                <ul className="mt-2 list-inside list-disc text-sm text-red-200/90">
                  {schemaReport.pendingMigrations.map((m) => (
                    <li key={m} className="font-mono text-xs">
                      {m}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-gray-400">
                  Na serveru spusťte: <code className="rounded bg-black/40 px-1.5 py-0.5">npx prisma migrate deploy</code>
                </p>
              </div>
            )}

            {schemaReport.missingTables.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-200">Chybějící tabulky</p>
                <ul className="mt-1 list-inside list-disc text-sm text-gray-300">
                  {schemaReport.missingTables.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(schemaReport.missingColumnsByTable).length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-200">Chybějící sloupce</p>
                <div className="mt-2 space-y-2 text-sm">
                  {Object.entries(schemaReport.missingColumnsByTable).map(([table, cols]) => (
                    <div key={table} className="rounded-lg bg-black/25 px-3 py-2">
                      <span className="font-mono text-brand-yellow">{table}</span>
                      <span className="text-gray-500"> — </span>
                      <span className="text-gray-300">{cols.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {schemaReport.alterHintsSql.length > 0 && (
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-200">Orientační SQL (ALTER) — raději použijte migrace</p>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(schemaReport.alterHintsSql.join('\n'))}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                  >
                    Kopírovat SQL
                  </button>
                </div>
                <pre className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-[#0a0a0a] p-3 font-mono text-xs text-gray-300">
                  {schemaReport.alterHintsSql.join('\n')}
                </pre>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-200">Checklist (kroky)</p>
              <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-gray-300">
                {schemaReport.checklist.map((line, i) => (
                  <li key={i} className="whitespace-pre-wrap pl-1">
                    {line}
                  </li>
                ))}
              </ol>
            </div>

            {(schemaReport.extraTablesInDb.length > 0 || Object.keys(schemaReport.extraColumnsByTable).length > 0) && (
              <details className="text-sm text-gray-500">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                  Navíc v databázi (není v Prisma modelu)
                </summary>
                {schemaReport.extraTablesInDb.length > 0 && (
                  <p className="mt-2">Tabulky: {schemaReport.extraTablesInDb.join(', ')}</p>
                )}
                {Object.keys(schemaReport.extraColumnsByTable).length > 0 && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/30 p-2 text-xs">
                    {JSON.stringify(schemaReport.extraColumnsByTable, null, 2)}
                  </pre>
                )}
              </details>
            )}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-500">{summary.ok}</p>
              <p className="text-xs text-gray-400">V pořádku</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-500">{summary.error}</p>
              <p className="text-xs text-gray-400">Chyby</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-yellow-500">{summary.missing}</p>
              <p className="text-xs text-gray-400">Chybějící</p>
            </div>
          </div>
        )}

        {summary && summary.error === 0 && summary.missing === 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-400">Vše v pořádku!</h2>
            <p className="text-gray-400 text-sm mt-1">Databáze je kompletní a připravená k použití.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {lastCheck && <p className="text-xs text-gray-500 mb-2">Poslední kontrola: {lastCheck}</p>}

            {results.filter((r) => r.status === 'error').length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">Chyby (nutno opravit)</h3>
                {results
                  .filter((r) => r.status === 'error')
                  .map((r, i) => (
                    <div key={`e-${i}`} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-2">
                      <div className="flex items-start gap-3">
                        {statusIcon(r.status)}
                        <div className="flex-1">
                          <p className="font-medium text-white">{r.name}</p>
                          <p className="text-sm text-red-400">{r.message}</p>
                          {r.details && (
                            <pre className="mt-2 text-xs text-red-300 bg-red-500/10 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                              {r.details}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {results.filter((r) => r.status === 'missing').length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-2">Chybějící (volitelné)</h3>
                {results
                  .filter((r) => r.status === 'missing')
                  .map((r, i) => (
                    <div key={`m-${i}`} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 mb-2">
                      <div className="flex items-start gap-3">
                        {statusIcon(r.status)}
                        <div className="flex-1">
                          <p className="font-medium text-white">{r.name}</p>
                          <p className="text-sm text-yellow-400">{r.message}</p>
                          {r.details && (
                            <pre className="mt-2 text-xs text-yellow-300 bg-yellow-500/10 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                              {r.details}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2">V pořádku</h3>
              {results
                .filter((r) => r.status === 'ok')
                .map((r, i) => (
                  <div key={`o-${i}`} className="bg-[#1A1A1A] border border-white/5 rounded-lg p-3 mb-1 flex items-center gap-3">
                    {statusIcon(r.status)}
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-sm text-white">{r.name}</span>
                      <span className="text-xs text-gray-500 text-right">{r.message}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && !minimal && results.length === 0 && !summary && (
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-12 text-center">
            <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Klikněte na „Spustit kontrolu“</h3>
            <p className="text-gray-500 text-sm">
              Bez klíče uvidíte jen stav připojení k databázi. S klíčem z Coolify (CRON_SECRET nebo HEALTH_CHECK_SECRET) získáte
              kontrolu tabulek, sloupců a proměnných.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
