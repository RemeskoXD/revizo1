/** Příplatek za urgentní termín (Kč) – nad základní cenu typu revize. */
export const URGENT_SURCHARGE_CZK = 2000;

const BASE_BY_SERVICE_ID: Record<string, number> = {
  elektro_byt: 2500,
  elektro_dum: 3500,
  elektro_spolecne: 4000,
  plyn: 1800,
  hromosvod: 3000,
  kominy: 1200,
  hasici_pristroje: 500,
  pozarni: 3500,
  vytahy: 5000,
  tlakove: 2500,
  komplexni: 5000,
  vlastni_revize: 0,
};

/**
 * Základní cena dle interního kódu typu služby (stejné ID jako v nové objednávce / dashboard).
 */
export function getBasePriceForServiceTypeId(serviceTypeId: string | null | undefined): number {
  if (!serviceTypeId) return 1500;
  return BASE_BY_SERVICE_ID[serviceTypeId] ?? 1500;
}

export function getOrderTotalPrice(options: { serviceTypeId: string; isUrgent: boolean }): number {
  if (options.serviceTypeId === 'vlastni_revize') return 0;
  let total = getBasePriceForServiceTypeId(options.serviceTypeId);
  if (options.isUrgent) total += URGENT_SURCHARGE_CZK;
  return total;
}

export function formatPriceCzk(n: number): string {
  return `${n.toLocaleString('cs-CZ')} Kč`;
}
