/**
 * Filtrace kategorií revizí podle role uživatele.
 * Viz docs/business-decisions.md sekce 1.2.
 *
 * Pole `RevisionCategory.targetRoles` je CSV (např. "CUSTOMER,SVJ"). NULL/prázdné = pro všechny.
 */

export type RevisionCategoryLike = {
  targetRoles?: string | null;
};

/** Parse CSV string z DB do pole rolí (uppercase, trimmed). */
export function parseTargetRoles(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);
}

/** Vrací TRUE, pokud daná kategorie je dostupná pro tuto roli. */
export function isCategoryForRole(
  category: RevisionCategoryLike,
  role: string,
): boolean {
  const targets = parseTargetRoles(category.targetRoles);
  if (targets.length === 0) return true; // bez omezení
  return targets.includes(role.toUpperCase());
}

/** Filtruje pole kategorií podle role uživatele. */
export function filterCategoriesByRole<T extends RevisionCategoryLike>(
  categories: T[],
  role: string,
): T[] {
  return categories.filter((c) => isCategoryForRole(c, role));
}
