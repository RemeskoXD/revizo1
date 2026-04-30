import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkDatabaseSchema } from '@/lib/dbSchemaCheck';

export const dynamic = 'force-dynamic';

type CheckResult = {
  name: string;
  status: 'ok' | 'error' | 'missing';
  message: string;
  details?: string;
};

function healthDetailToken(): string | undefined {
  return process.env.HEALTH_CHECK_SECRET || process.env.CRON_SECRET || undefined;
}

function canSeeDetailedHealth(req: Request): boolean {
  const expected = healthDetailToken();
  if (!expected) {
    return process.env.NODE_ENV !== 'production';
  }
  const url = new URL(req.url);
  const q = url.searchParams.get('secret');
  const auth = req.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const candidate = bearer || q || '';
  if (candidate.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(candidate, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const detailed = canSeeDetailedHealth(req);

  if (!detailed) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({
        mode: 'minimal',
        status: 'ok',
        database: 'connected',
        hint:
          process.env.NODE_ENV === 'production'
            ? 'Pro úplnou diagnostiku nastavte HEALTH_CHECK_SECRET nebo CRON_SECRET a pošlete Authorization: Bearer <token>.'
            : 'Vývoj: celá diagnostika je dostupná bez tokenu, pokud není nastaven HEALTH_CHECK_SECRET ani CRON_SECRET.',
      });
    } catch {
      return NextResponse.json(
        { mode: 'minimal', status: 'error', database: 'disconnected', message: 'Databáze není dostupná' },
        { status: 503 }
      );
    }
  }

  const results: CheckResult[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  try {
    await prisma.$queryRaw`SELECT 1`;
    results.push({ name: 'Připojení k databázi', status: 'ok', message: 'Databáze je dostupná' });
  } catch (e: unknown) {
    results.push({
      name: 'Připojení k databázi',
      status: 'error',
      message: 'Nelze se připojit k databázi',
      details: isProd ? undefined : e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ mode: 'detailed', results, summary: { ok: 0, error: 1, missing: 0 } }, { status: 503 });
  }

  type SchemaPayload = {
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

  let schema: SchemaPayload | null = null;
  let schemaLoadError: string | undefined;

  try {
    const report = await checkDatabaseSchema();
    const missingColCount = Object.values(report.missingColumnsByTable).reduce(
      (n, a) => n + a.length,
      0
    );
    const checklist: string[] = [];
    if (!report.migrationSync.migrationsTableExists) {
      results.push({
        name: 'Prisma: tabulka _prisma_migrations',
        status: 'missing',
        message: 'V databázi není evidence migrací',
        details:
          'Pravděpodobně nová DB. Spusťte alespoň jednou: npx prisma migrate deploy (nebo migrate dev lokálně).',
      });
      checklist.push('Spustit prisma migrate deploy – vytvoří se _prisma_migrations a tabulky ze složky prisma/migrations.');
    } else if (report.migrationSync.pendingMigrations.length > 0) {
      results.push({
        name: 'Prisma: neaplikované migrace',
        status: 'error',
        message: `${report.migrationSync.pendingMigrations.length} migrací čeká na nasazení`,
        details: report.migrationSync.pendingMigrations.join('\n'),
      });
      checklist.push(
        `Na serveru spusťte: npx prisma migrate deploy\nČekající složky: ${report.migrationSync.pendingMigrations.join(', ')}`
      );
    } else {
      results.push({
        name: 'Prisma: migrace',
        status: 'ok',
        message: `Všechny lokální migrace jsou v DB (${report.migrationSync.appliedMigrationNames.length})`,
      });
    }

    for (const t of report.missingTables) {
      results.push({
        name: `Schéma: tabulka „${t}“`,
        status: 'missing',
        message: 'Tabulka z prisma/schema.prisma v MySQL chybí',
        details: 'Oprava: prisma migrate deploy (nebo doplnění SQL z migrací).',
      });
    }
    checklist.push(
      ...report.missingTables.map(
        (t) => `Doplnit tabulku „${t}“ (nejčastěji přes migraci / migrate deploy).`
      )
    );

    for (const [table, cols] of Object.entries(report.missingColumnsByTable)) {
      results.push({
        name: `Schéma: sloupce „${table}“`,
        status: 'error',
        message: `Chybí ${cols.length} sloupců oproti prisma/schema.prisma`,
        details: cols.join(', '),
      });
      checklist.push(`Tabulka ${table}: přidat sloupce: ${cols.join(', ')}.`);
    }

    if (report.alterHints.length > 0) {
      results.push({
        name: 'Návrh SQL (jen chybějící sloupce)',
        status: 'missing',
        message:
          'Minimální ALTER – ověřte typy a indexy; spolehlivější je vždy hotová migrace z repa.',
        details: report.alterHints.join('\n'),
      });
      checklist.push(
        'Preferujte `npx prisma migrate deploy`. ALTER výše je orientační pro ruční doplnění.'
      );
    }

    const extraColTotal = Object.values(report.extraColumnsByTable).reduce(
      (s, a) => s + a.length,
      0
    );
    if (report.extraTablesInDb.length > 0) {
      results.push({
        name: 'Tabulky navíc v databázi',
        status: 'ok',
        message: `${report.extraTablesInDb.length} tabulek není v prisma/schema.prisma`,
        details: report.extraTablesInDb.join(', '),
      });
    }
    if (extraColTotal > 0) {
      results.push({
        name: 'Sloupce navíc v databázi',
        status: 'ok',
        message: `${extraColTotal} sloupců navíc (mimo aktuální Prisma model)`,
        details: JSON.stringify(report.extraColumnsByTable, null, 2),
      });
    }

    const schemaOk =
      report.missingTables.length === 0 &&
      missingColCount === 0 &&
      report.migrationSync.pendingMigrations.length === 0 &&
      report.migrationSync.migrationsTableExists;

    if (schemaOk) {
      results.push({
        name: 'Schéma vs. prisma/schema.prisma',
        status: 'ok',
        message: `Shoda – ${report.expectedModelsCount} modelů, databáze „${report.databaseName ?? '?'}“`,
      });
    }

    for (const modelName of [
      'User',
      'Order',
      'Notification',
      'RevisionCategory',
      'Property',
    ]) {
      if (report.missingTables.includes(modelName)) continue;
      if (report.missingColumnsByTable[modelName]?.length) continue;
      try {
        const rowCount: { cnt?: number | bigint }[] = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as cnt FROM \`${modelName}\``
        );
        const count = Number(rowCount[0]?.cnt ?? 0);
        results.push({
          name: `Řádky: ${modelName}`,
          status: 'ok',
          message: `${count.toLocaleString('cs-CZ')} záznamů`,
        });
      } catch {
        /* ignore */
      }
    }

    if (checklist.length === 0 && schemaOk) {
      checklist.push('Žádné doplnění schématu není potřeba.');
    }

    schema = {
      databaseName: report.databaseName,
      checkedAt: report.checkedAt,
      missingTables: report.missingTables,
      missingColumnsByTable: report.missingColumnsByTable,
      extraTablesInDb: report.extraTablesInDb,
      extraColumnsByTable: report.extraColumnsByTable,
      pendingMigrations: report.migrationSync.pendingMigrations,
      appliedMigrationsCount: report.migrationSync.appliedMigrationNames.length,
      migrationsTableExists: report.migrationSync.migrationsTableExists,
      alterHintsSql: report.alterHints,
      checklist,
    };
  } catch (e: unknown) {
    schemaLoadError = e instanceof Error ? e.message : String(e);
    results.push({
      name: 'Kontrola schématu (prisma/schema.prisma)',
      status: 'error',
      message: 'Nepodařilo se porovnat DB se schématem',
      details: isProd ? schemaLoadError?.slice(0, 300) : schemaLoadError,
    });
  }

  try {
    const fks: unknown[] = await prisma.$queryRaw`
      SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME
    `;
    results.push({
      name: 'Cizí klíče (Foreign Keys)',
      status: 'ok',
      message: `Nalezeno ${fks.length} cizích klíčů`,
    });
  } catch (e: unknown) {
    results.push({
      name: 'Cizí klíče (Foreign Keys)',
      status: 'error',
      message: 'Chyba při kontrole cizích klíčů',
      details: isProd ? undefined : e instanceof Error ? e.message?.slice(0, 200) : undefined,
    });
  }

  try {
    const indexes: unknown[] = await prisma.$queryRawUnsafe(
      `SHOW INDEX FROM \`Order\` WHERE Column_name = 'cancelToken' AND Non_unique = 0`
    );
    if (indexes.length > 0) {
      results.push({ name: 'Index: Order.cancelToken (UNIQUE)', status: 'ok', message: 'Unikátní index existuje' });
    } else {
      results.push({
        name: 'Index: Order.cancelToken (UNIQUE)',
        status: 'missing',
        message: 'Chybí unikátní index na cancelToken',
        details: 'ALTER TABLE `Order` ADD UNIQUE INDEX `Order_cancelToken_key`(`cancelToken`);',
      });
    }
  } catch {
    results.push({ name: 'Index: Order.cancelToken', status: 'error', message: 'Nelze ověřit' });
  }

  const envChecks = [
    { key: 'DATABASE_URL', required: true },
    { key: 'NEXTAUTH_SECRET', required: true },
    { key: 'NEXTAUTH_URL', required: true },
    { key: 'SMTP_HOST', required: false },
    { key: 'SMTP_USER', required: false },
    { key: 'SMTP_PASS', required: false },
    { key: 'SMTP_FROM', required: false },
    { key: 'CRON_SECRET', required: false },
  ];

  for (const env of envChecks) {
    const value = process.env[env.key];
    if (value) {
      results.push({ name: `ENV: ${env.key}`, status: 'ok', message: 'Nastaveno' });
    } else {
      results.push({
        name: `ENV: ${env.key}`,
        status: env.required ? 'error' : 'missing',
        message: env.required ? 'CHYBÍ – povinná proměnná!' : 'Nenastaveno (volitelné)',
      });
    }
  }

  const summary = {
    ok: results.filter((r) => r.status === 'ok').length,
    error: results.filter((r) => r.status === 'error').length,
    missing: results.filter((r) => r.status === 'missing').length,
  };

  return NextResponse.json({
    mode: 'detailed',
    results,
    summary,
    schema,
    schemaLoadError,
  });
}
