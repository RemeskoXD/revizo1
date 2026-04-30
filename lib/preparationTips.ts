export const PREPARATION_TIPS: Record<string, string[]> = {
  'elektro_byt': [
    'Zajistěte přístup ke všem rozvaděčům a jističům',
    'Nachystejte si předchozí revizní zprávu (pokud máte)',
    'Informujte ostatní obyvatele o krátkodobém vypnutí proudu',
    'Ujistěte se, že jsou všechny zásuvky přístupné',
  ],
  'elektro_dum': [
    'Zajistěte přístup k hlavnímu rozvaděči a všem podružným',
    'Nachystejte si projektovou dokumentaci elektroinstalace',
    'Připravte přístup do všech místností včetně sklepa a půdy',
    'Informujte domácnost o krátkodobém vypnutí proudu',
    'Nachystejte si předchozí revizní zprávu',
  ],
  'plyn': [
    'Zajistěte přístup ke kotli, bojleru a plynoměru',
    'Nachystejte si servisní knihu kotle',
    'Ujistěte se, že je volný přístup ke všem plynovým spotřebičům',
    'Nevětrejte těsně před revizí (ovlivní měření)',
    'Nachystejte si předchozí revizní zprávu',
  ],
  'hromosvod': [
    'Zajistěte přístup na střechu (žebřík, klíče od půdy)',
    'Odkliďte věci od svodu hromosvodu podél zdi',
    'Nachystejte si předchozí revizní zprávu',
    'Informujte technika o případných stavebních úpravách',
  ],
  'vlastni_revize': [],
};

export const GENERIC_TIPS = [
  'Mějte připravený doklad totožnosti',
  'Technik potřebuje přístup ke všem relevantním prostorám',
  'Počítejte s dobou revize cca 1–3 hodiny dle rozsahu',
  'Nachystejte si předchozí revizní zprávy pokud existují',
];

export function getTipsForService(serviceType: string): string[] {
  const specific = PREPARATION_TIPS[serviceType] || [];
  if (specific.length > 0) return specific;
  return GENERIC_TIPS;
}
