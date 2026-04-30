import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export type ExpectedColumn = {
  name: string;
  prismaType: string;
  isOptional: boolean;
  hasLongText?: boolean;
  hasText?: boolean;
  varcharLength?: number;
};

type ExpectedModel = {
  name: string;
  columns: ExpectedColumn[];
};

const SCALAR_TYPES = new Set([
  "String",
  "Int",
  "Boolean",
  "Float",
  "DateTime",
  "Json",
  "BigInt",
  "Bytes",
]);

function parsePrismaSchema(schemaText: string): ExpectedModel[] {
  const lines = schemaText.split(/\r?\n/);
  const models: ExpectedModel[] = [];

  let current: ExpectedModel | null = null;

  const isStart = (line: string) => {
    const m = line.match(/^\s*model\s+(\w+)\s*\{\s*$/);
    return m ? m[1] : null;
  };

  for (let i = 0; i < lines.length; i++) {
    const startModelName = isStart(lines[i]);
    if (startModelName) {
      current = { name: startModelName, columns: [] };
      continue;
    }

    if (current) {
      const line = lines[i].replace(/\/\/.*$/, "").trim();
      if (!line) continue;
      if (line.startsWith("@@")) continue;
      if (line === "}") {
        models.push(current);
        current = null;
        continue;
      }

      // Field line example:
      //   id            String    @id @default(cuid())
      //   isDeleted     Boolean   @default(false)
      //   company       User?     @relation(...)
      //   technicians   User[]    @relation(...)
      const m = line.match(/^(\w+)\s+([^\s]+)(\s|$)(.*)$/);
      if (!m) continue;

      const fieldName = m[1];
      const typeTokenRaw = m[2]; // e.g. "String", "String?", "User[]", "DateTime?"
      const rest = m[4] || "";

      // Ignore list/relation backrefs like `orders Order[]` / `technicians User[]`
      if (typeTokenRaw.includes("[]")) continue;

      const isOptional = typeTokenRaw.endsWith("?");
      const baseType = typeTokenRaw.replace(/\?$/, "");

      if (!SCALAR_TYPES.has(baseType)) continue;

      const varcharM = rest.match(/@db\.VarChar\((\d+)\)/);
      current.columns.push({
        name: fieldName,
        prismaType: baseType,
        isOptional,
        hasLongText: rest.includes("@db.LongText"),
        hasText: rest.includes("@db.Text"),
        varcharLength: varcharM ? parseInt(varcharM[1], 10) : undefined,
      });
    }
  }

  return models;
}

const SYSTEM_TABLES_LOWER = new Set([
  "_prisma_migrations",
]);

function mysqlTypeSql(col: ExpectedColumn): string {
  if (col.hasLongText) return "LONGTEXT";
  if (col.hasText) return "TEXT";
  if (col.prismaType === "String") {
    const n = col.varcharLength ?? 191;
    return `VARCHAR(${n})`;
  }
  if (col.prismaType === "Boolean") return "BOOLEAN";
  if (col.prismaType === "Int") return "INT";
  if (col.prismaType === "Float") return "DOUBLE";
  if (col.prismaType === "DateTime") return "DATETIME(3)";
  if (col.prismaType === "Json") return "JSON";
  if (col.prismaType === "BigInt") return "BIGINT";
  return "TEXT";
}

/** Jednoduchý ALTER pro ruční doplnění – u složitých vztahů raději `prisma migrate deploy`. */
export function buildAlterAddColumnStatements(
  models: ExpectedModel[],
  missingColumnsByTable: Record<string, string[]>
): string[] {
  const byName = new Map(models.map((m) => [m.name, m]));
  const statements: string[] = [];
  for (const [table, cols] of Object.entries(missingColumnsByTable)) {
    const model = byName.get(table);
    if (!model) continue;
    for (const colName of cols) {
      const col = model.columns.find((c) => c.name === colName);
      if (!col) continue;
      const typeSql = mysqlTypeSql(col);
      const nullable = col.isOptional ? "NULL" : "NOT NULL";
      let defaultSql = "";
      if (col.prismaType === "Boolean" && !col.isOptional) {
        defaultSql = " DEFAULT false";
      }
      statements.push(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${typeSql} ${nullable}${defaultSql};`
      );
    }
  }
  return statements;
}

export type MigrationSync = {
  migrationsTableExists: boolean;
  appliedMigrationNames: string[];
  migrationFoldersOnDisk: string[];
  pendingMigrations: string[];
};

export function readMigrationFolderNames(): string[] {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

export async function checkPrismaMigrationsTable(): Promise<MigrationSync> {
  const migrationFoldersOnDisk = readMigrationFolderNames();
  let migrationsTableExists = false;
  let appliedMigrationNames: string[] = [];
  try {
    const rows = (await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations ORDER BY finished_at ASC
    `) as { migration_name: string }[];
    migrationsTableExists = true;
    appliedMigrationNames = rows.map((r) => r.migration_name);
  } catch {
    migrationsTableExists = false;
  }
  const appliedSet = new Set(appliedMigrationNames);
  const pendingMigrations = migrationFoldersOnDisk.filter((name) => !appliedSet.has(name));
  return {
    migrationsTableExists,
    appliedMigrationNames,
    migrationFoldersOnDisk,
    pendingMigrations,
  };
}

export async function checkDatabaseSchema(): Promise<{
  databaseName: string | null;
  checkedAt: string;
  missingTables: string[];
  missingColumnsByTable: Record<string, string[]>;
  extraColumnsByTable: Record<string, string[]>;
  extraTablesInDb: string[];
  expectedModelsCount: number;
  existingTablesCount: number;
  alterHints: string[];
  migrationSync: MigrationSync;
}> {
  const prismaSchemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  let schemaText: string;
  try {
    schemaText = fs.readFileSync(prismaSchemaPath, "utf8");
  } catch (e: any) {
    throw new Error(
      `Nepodařilo se přečíst prisma schema: ${prismaSchemaPath}. ` +
        `Zkontroluj, že se soubor deployuje spolu s aplikací. Původní chyba: ${e?.message ?? e}`
    );
  }
  const expectedModels = parsePrismaSchema(schemaText);

  const dbRows = (await prisma.$queryRaw<{ dbName: string }[]>`
    SELECT DATABASE() as dbName
  `) as { dbName: string }[];
  const databaseName = dbRows?.[0]?.dbName ?? null;

  if (!databaseName) {
    throw new Error("Nelze zjistit aktuální databázi (DATABASE() je null).");
  }

  const columnsRows = (await prisma.$queryRaw<
    { TABLE_NAME: string; COLUMN_NAME: string }[]
  >`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ${databaseName}
  `) as { TABLE_NAME: string; COLUMN_NAME: string }[];

  const tablesRows = (await prisma.$queryRaw<{ TABLE_NAME: string }[]>`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ${databaseName} AND TABLE_TYPE = 'BASE TABLE'
  `) as { TABLE_NAME: string }[];

  const existingTablesSet = new Set(tablesRows.map((r) => r.TABLE_NAME.toLowerCase()));
  const existingColumnsByTable: Record<string, Set<string>> = {};

  for (const r of columnsRows) {
    const t = r.TABLE_NAME.toLowerCase();
    if (!existingColumnsByTable[t]) existingColumnsByTable[t] = new Set();
    existingColumnsByTable[t].add(r.COLUMN_NAME.toLowerCase());
  }

  const missingTables: string[] = [];
  const missingColumnsByTable: Record<string, string[]> = {};
  const extraColumnsByTable: Record<string, string[]> = {};

  const expectedTableNamesLower = new Set(
    expectedModels.map((m) => m.name.toLowerCase())
  );

  for (const model of expectedModels) {
    if (!existingTablesSet.has(model.name.toLowerCase())) {
      missingTables.push(model.name);
      continue;
    }

    const existingCols =
      existingColumnsByTable[model.name.toLowerCase()] ?? new Set<string>();
    const expectedColNamesLower = new Set(
      model.columns.map((c) => c.name.toLowerCase())
    );
    const missingCols = model.columns
      .map((c) => c.name)
      .filter((col) => !existingCols.has(col.toLowerCase()));

    if (missingCols.length > 0) {
      missingColumnsByTable[model.name] = missingCols;
    }

    const extras: string[] = [];
    for (const c of existingCols) {
      if (!expectedColNamesLower.has(c)) {
        const orig = columnsRows.find(
          (row) =>
            row.TABLE_NAME.toLowerCase() === model.name.toLowerCase() &&
            row.COLUMN_NAME.toLowerCase() === c
        );
        if (orig) extras.push(orig.COLUMN_NAME);
      }
    }
    if (extras.length > 0) {
      extraColumnsByTable[model.name] = extras.sort();
    }
  }

  const extraTablesInDb: string[] = [];
  for (const t of existingTablesSet) {
    if (SYSTEM_TABLES_LOWER.has(t)) continue;
    if (!expectedTableNamesLower.has(t)) {
      const orig = tablesRows.find((row) => row.TABLE_NAME.toLowerCase() === t);
      if (orig) extraTablesInDb.push(orig.TABLE_NAME);
    }
  }
  extraTablesInDb.sort();

  const migrationSync = await checkPrismaMigrationsTable();
  const alterHints = buildAlterAddColumnStatements(
    expectedModels,
    missingColumnsByTable
  );

  return {
    databaseName,
    checkedAt: new Date().toISOString(),
    missingTables,
    missingColumnsByTable,
    extraColumnsByTable,
    extraTablesInDb,
    expectedModelsCount: expectedModels.length,
    existingTablesCount: existingTablesSet.size,
    alterHints,
    migrationSync,
  };
}

