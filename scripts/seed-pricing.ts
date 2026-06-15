import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PACKAGES = [
  {
    name: 'Elektroinstalace a bleskosvody',
    description: 'Kompletní revize elektroinstalace a systémů ochrany proti blesku.',
    approximatePrice: 3500,
    isVisibleRodinnyDum: true,
    isVisibleSVJ: true,
    orderIndex: 1,
  },
  {
    name: 'Výtahy a plošiny (Zdvihací zařízení osobní/nákladní)',
    description: 'Odborné prohlídky a zkoušky výtahů a zdvihacích plošin.',
    approximatePrice: 1800,
    isVisibleRodinnyDum: false,
    isVisibleSVJ: true,
    orderIndex: 2,
  },
  {
    name: 'Plynová zařízení',
    description: 'Revize a kontroly plynovodů a plynových spotřebičů.',
    approximatePrice: 2200,
    isVisibleRodinnyDum: true,
    isVisibleSVJ: true,
    orderIndex: 3,
  },
  {
    name: 'Spalinové cesty a kotle na tuhá paliva',
    description: 'Kontrola a čištění komínů a revize spalinových cest.',
    approximatePrice: 1400,
    isVisibleRodinnyDum: true,
    isVisibleSVJ: true,
    orderIndex: 4,
  },
  {
    name: 'Požární ochrana (PO)',
    description: 'Kontrola hasicích přístrojů, hydrantů a požárních uzávěrů.',
    approximatePrice: 2500,
    isVisibleRodinnyDum: true,
    isVisibleSVJ: true,
    orderIndex: 5,
  },
  {
    name: 'Zdvihací zařízení (mimo výtahy)',
    description: 'Revize jeřábů, kladkostrojů a jiných zdvihacích zařízení.',
    approximatePrice: 2500,
    isVisibleRodinnyDum: false,
    isVisibleSVJ: true,
    orderIndex: 6,
  },
  {
    name: 'Tlakové nádoby stabilní (TNS)',
    description: 'Provozní a vnitřní revize tlakových nádob.',
    approximatePrice: 1300,
    isVisibleRodinnyDum: true,
    isVisibleSVJ: true,
    orderIndex: 7,
  },
  {
    name: 'BOZP a Ostatní technická zařízení',
    description: 'Kontrola regálů, žebříků, vrat a veřejných hřišť.',
    approximatePrice: 1200,
    isVisibleRodinnyDum: false,
    isVisibleSVJ: true,
    orderIndex: 8,
  },
];

const PRICING_ITEMS = [
  // 1. Elektroinstalace a bleskosvody
  { code: 'el_byt', category: 'Elektroinstalace a bleskosvody', name: 'Revize elektroinstalace – Byt (do 3+1)', priceCzk: 3500, unit: 'pausal' },
  { code: 'el_rd', category: 'Elektroinstalace a bleskosvody', name: 'Revize elektroinstalace – Rodinný dům', priceCzk: 7500, unit: 'pausal' },
  { code: 'el_rozvadec', category: 'Elektroinstalace a bleskosvody', name: 'Revize elektroměrového rozvaděče (přihláška)', priceCzk: 1800, unit: 'ks' },
  { code: 'el_hromosvod', category: 'Elektroinstalace a bleskosvody', name: 'Revize hromosvodu (LPS) – Rodinný dům', priceCzk: 3500, unit: 'pausal' },
  { code: 'el_hrom_svod', category: 'Elektroinstalace a bleskosvody', name: 'Revize hromosvodu – průmysl (cena za 1 svod)', priceCzk: 850, unit: 'ks' },
  { code: 'el_spotrebic', category: 'Elektroinstalace a bleskosvody', name: 'Revize elektrospotřebiče (PC, monitor, IT technika)', priceCzk: 95, unit: 'ks' },
  { code: 'el_naradi', category: 'Elektroinstalace a bleskosvody', name: 'Revize ručního nářadí (vrtačky, úhlové brusky atd.)', priceCzk: 120, unit: 'ks' },
  { code: 'el_stroj', category: 'Elektroinstalace a bleskosvody', name: 'Revize pracovního stroje / výrobní linky', priceCzk: 1600, unit: 'ks' },

  // 2. Výtahy a plošiny
  { code: 'vyt_prohlidka', category: 'Výtahy a plošiny', name: 'Odborná prohlídka výtahu (pravidelná provozní)', priceCzk: 1800, unit: 'ks' },
  { code: 'vyt_zkouska', category: 'Výtahy a plošiny', name: 'Odborná zkouška výtahu (opakovaná 1x za 3 roky)', priceCzk: 5500, unit: 'ks' },
  { code: 'vyt_inspekce', category: 'Výtahy a plošiny', name: 'Inspekční prohlídka výtahu (autorizovaná 1x za 6 let)', priceCzk: 7500, unit: 'ks' },
  { code: 'vyt_plosina', category: 'Výtahy a plošiny', name: 'Revize invalidní / schodišťové plošiny a zvedáku', priceCzk: 2200, unit: 'ks' },

  // 3. Plynová zařízení
  { code: 'plyn_byt', category: 'Plynová zařízení', name: 'Revize plynovodu – Byt', priceCzk: 2200, unit: 'pausal' },
  { code: 'plyn_rd', category: 'Plynová zařízení', name: 'Revize plynovodu – Rodinný dům', priceCzk: 3800, unit: 'pausal' },
  { code: 'plyn_kotel_rev', category: 'Plynová zařízení', name: 'Výchozí revize plynového kotle (před spuštěním)', priceCzk: 2800, unit: 'ks' },
  { code: 'plyn_kotel_servis', category: 'Plynová zařízení', name: 'Roční kontrola, servis a čištění plynového kotle', priceCzk: 2200, unit: 'ks' },
  { code: 'plyn_tlak', category: 'Plynová zařízení', name: 'Tlaková zkouška plynovodu (zkouška těsnosti)', priceCzk: 1800, unit: 'ks' },

  // 4. Spalinové cesty a kotle na tuhá paliva
  { code: 'kom_rocni', category: 'Spalinové cesty a kotle na tuhá paliva', name: 'Roční kontrola a čištění komínu / průduchu', priceCzk: 1400, unit: 'ks' },
  { code: 'kom_vychozi', category: 'Spalinové cesty a kotle na tuhá paliva', name: 'Výchozí revize spalinové cesty (nová/rekonstrukce)', priceCzk: 3500, unit: 'ks' },
  { code: 'kom_kamera', category: 'Spalinové cesty a kotle na tuhá paliva', name: 'Prohlídka komínového tělesa inspekční kamerou', priceCzk: 2500, unit: 'ks' },
  { code: 'kom_tuhapaliva', category: 'Spalinové cesty a kotle na tuhá paliva', name: 'Zákonná kontrola kotle na tuhá paliva (OZO 1x za 3 roky)', priceCzk: 2000, unit: 'ks' },

  // 5. Požární ochrana (PO)
  { code: 'po_php', category: 'Požární ochrana (PO)', name: 'Roční kontrola hasicího přístroje (PHP)', priceCzk: 90, unit: 'ks' },
  { code: 'po_php_tlak', category: 'Požární ochrana (PO)', name: 'Periodická tlaková zkouška hasicího přístroje (dílenská)', priceCzk: 550, unit: 'ks' },
  { code: 'po_hydrant', category: 'Požární ochrana (PO)', name: 'Kontrola a revize vnitřního požárního hydrantu', priceCzk: 250, unit: 'ks' },
  { code: 'po_klapka', category: 'Požární ochrana (PO)', name: 'Kontrola požární klapky / stěnové ucpávky', priceCzk: 150, unit: 'ks' },
  { code: 'po_dvere', category: 'Požární ochrana (PO)', name: 'Kontrola a revize požárních dveří a uzávěrů', priceCzk: 180, unit: 'ks' },
  { code: 'po_prohlidka', category: 'Požární ochrana (PO)', name: 'Preventivní požární prohlídka objektu (technik PO)', priceCzk: 2500, unit: 'pausal' },

  // 6. Zdvihací zařízení (mimo výtahy)
  { code: 'zdvih_kladka', category: 'Zdvihací zařízení (mimo výtahy)', name: 'Revize ručního / elektrického kladkostroje', priceCzk: 950, unit: 'ks' },
  { code: 'zdvih_jerab_maly', category: 'Zdvihací zařízení (mimo výtahy)', name: 'Revize mostového / otočného jeřábu (nosnost do 5t)', priceCzk: 2500, unit: 'ks' },
  { code: 'zdvih_jerab_velky', category: 'Zdvihací zařízení (mimo výtahy)', name: 'Revize mostového / portálového jeřábu (nosnost nad 5t)', priceCzk: 4000, unit: 'ks' },
  { code: 'zdvih_auto', category: 'Zdvihací zařízení (mimo výtahy)', name: 'Revize automobilového dvousloupového zvedáku', priceCzk: 1800, unit: 'ks' },
  { code: 'zdvih_vazak', category: 'Zdvihací zařízení (mimo výtahy)', name: 'Kontrola vázacích prostředků (vázací řetězy, popruhy)', priceCzk: 60, unit: 'ks' },

  // 7. Tlakové nádoby stabilní (TNS)
  { code: 'tns_mala', category: 'Tlakové nádoby stabilní (TNS)', name: 'Provozní revize TNS do 200 litrů (expanzomaty, malé bojlery)', priceCzk: 1300, unit: 'ks' },
  { code: 'tns_velka', category: 'Tlakové nádoby stabilní (TNS)', name: 'Provozní revize TNS nad 200 litrů (tlakové vzdušníky kompresorů)', priceCzk: 2600, unit: 'ks' },
  { code: 'tns_vnitrni', category: 'Tlakové nádoby stabilní (TNS)', name: 'Vnitřní revize a tlaková zkouška těsnosti TNS', priceCzk: 3800, unit: 'ks' },

  // 8. BOZP a Ostatní technická zařízení
  { code: 'bozp_regal', category: 'BOZP a Ostatní technická zařízení', name: 'Zákonná kontrola regálového systému (cena za 1 sloupec/pole)', priceCzk: 120, unit: 'ks' }, // pole maps to ks
  { code: 'bozp_zebrik', category: 'BOZP a Ostatní technická zařízení', name: 'Pravidelná kontrola žebříků, schůdků a pojízdných lešení', priceCzk: 80, unit: 'ks' },
  { code: 'bozp_vrata', category: 'BOZP a Ostatní technická zařízení', name: 'Revize průmyslových, sekčních nebo rolovacích vrat', priceCzk: 1200, unit: 'ks' },
  { code: 'bozp_hriste', category: 'BOZP a Ostatní technická zařízení', name: 'Roční hlavní kontrola veřejného / dětského hřiště', priceCzk: 4500, unit: 'pausal' },

  // 9. Cestovné, režie a hodinové sazby
  { code: 'doprava_pausal', category: 'Cestovné a režie', name: 'Paušální výjezd technika v rámci sídla / města', priceCzk: 600, unit: 'pausal' },
  { code: 'doprava_km', category: 'Cestovné a režie', name: 'Cestovné mimo domovské město technika', priceCzk: 16, unit: 'km' },
  { code: 'prace_hodina', category: 'Cestovné a režie', name: 'Práce technika v hodinové sazbě (odstraňování závad, konzultace)', priceCzk: 950, unit: 'hodina' },
];

async function main() {
  console.log('Seeding Service Packages...');
  for (const pkg of PACKAGES) {
    const existing = await prisma.servicePackage.findFirst({
      where: { name: pkg.name }
    });
    if (!existing) {
      await prisma.servicePackage.create({ data: pkg });
    } else {
      await prisma.servicePackage.update({
        where: { id: existing.id },
        data: pkg
      });
    }
  }

  console.log('Seeding Pricing Items...');
  for (const item of PRICING_ITEMS) {
    await prisma.pricingItem.upsert({
      where: { code: item.code },
      update: {
        category: item.category,
        name: item.name,
        priceCzk: item.priceCzk,
        unit: item.unit,
      },
      create: item,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
