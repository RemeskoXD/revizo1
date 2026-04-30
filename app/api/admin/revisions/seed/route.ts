import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const REVISION_CATEGORIES = [
  { name: 'Elektro – Administrativa', group: 'Elektrická zařízení', intervalMonths: 60, legalBasis: 'NV 190/2022 Sb.', description: 'Kancelářské a administrativní budovy' },
  { name: 'Elektro – Výroba, školy', group: 'Elektrická zařízení', intervalMonths: 36, legalBasis: 'NV 190/2022 Sb.', description: 'Výrobní prostory, školy a školská zařízení' },
  { name: 'Elektro – Nad 200 osob', group: 'Elektrická zařízení', intervalMonths: 24, legalBasis: 'NV 190/2022 Sb.', description: 'Prostory s kapacitou nad 200 osob' },
  { name: 'Elektro – Staveniště', group: 'Elektrická zařízení', intervalMonths: 6, legalBasis: 'NV 190/2022 Sb.', description: 'Dočasná elektrická instalace na staveništi' },
  { name: 'Elektro – Mobilní zařízení', group: 'Elektrická zařízení', intervalMonths: 12, legalBasis: 'NV 190/2022 Sb.', description: 'Mobilní a přenosná elektrická zařízení' },
  { name: 'Elektro – Mokré prostředí', group: 'Elektrická zařízení', intervalMonths: 12, legalBasis: 'NV 190/2022 Sb.', description: 'Prostory s vysokou vlhkostí (prádelny, bazény)' },
  { name: 'Elektro – Výbušné/požární', group: 'Elektrická zařízení', intervalMonths: 36, legalBasis: 'NV 190/2022 Sb.', description: 'Prostory s nebezpečím výbuchu nebo požáru' },
  { name: 'Hromosvody', group: 'Elektrická zařízení', intervalMonths: 48, legalBasis: 'NV 190/2022 Sb.', description: 'Hromosvodová zařízení (2 roky u nebezpečných objektů, 4 roky standard)' },
  { name: 'Plyn – Obecná revize', group: 'Plynová zařízení', intervalMonths: 36, legalBasis: 'NV 191/2022 Sb.', description: 'Plynová zařízení – lhůty dle dokumentace (cca 3–6 let)' },
  { name: 'Tlak – Kontrola', group: 'Tlaková zařízení', intervalMonths: 12, legalBasis: 'NV 192/2022 Sb.', description: 'Pravidelná kontrola tlakových zařízení' },
  { name: 'Tlak – Revize', group: 'Tlaková zařízení', intervalMonths: 36, legalBasis: 'NV 192/2022 Sb.', description: 'Revize tlakových zařízení (3–5 let)' },
  { name: 'Tlak – Zkouška', group: 'Tlaková zařízení', intervalMonths: 72, legalBasis: 'NV 192/2022 Sb.', description: 'Tlaková zkouška (6–9 let)' },
  { name: 'Zdvihy – Výtahy', group: 'Zdvihací zařízení', intervalMonths: 36, legalBasis: 'NV 193/2022 Sb.', description: 'Revize výtahů (3/6 let)' },
  { name: 'Zdvihy – Prohlídky', group: 'Zdvihací zařízení', intervalMonths: 3, legalBasis: 'NV 193/2022 Sb.', description: 'Pravidelné prohlídky zdvihacích zařízení (2–4 měsíce)' },
  { name: 'Požár – Hasicí přístroje kontrola', group: 'Požární ochrana', intervalMonths: 12, legalBasis: 'Zákon 133/1985 Sb.', description: 'Roční kontrola hasicích přístrojů' },
  { name: 'Požár – Hasicí přístroje zkouška', group: 'Požární ochrana', intervalMonths: 60, legalBasis: 'Zákon 133/1985 Sb.', description: 'Tlaková zkouška hasicích přístrojů (5/10 let)' },
  { name: 'Požár – Hydranty', group: 'Požární ochrana', intervalMonths: 12, legalBasis: 'Zákon 133/1985 Sb.', description: 'Kontrola hydrantů a požárních vodovodů (hadice 5 let)' },
  { name: 'Požár – PBZ', group: 'Požární ochrana', intervalMonths: 12, legalBasis: 'Zákon 133/1985 Sb.', description: 'Požárně bezpečnostní zařízení – roční kontrola' },
  { name: 'Požár – Komíny', group: 'Požární ochrana', intervalMonths: 12, legalBasis: 'Zákon 133/1985 Sb.', description: 'Kontrola a čištění komínů (spalinových cest)' },
];

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let created = 0;
    let skipped = 0;

    for (const cat of REVISION_CATEGORIES) {
      const existing = await prisma.revisionCategory.findUnique({ where: { name: cat.name } });
      if (!existing) {
        await prisma.revisionCategory.create({ data: cat });
        created++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ message: `Seed complete: ${created} created, ${skipped} already existed` });
  } catch (error) {
    console.error('Seed revision categories error:', error);
    return NextResponse.json({ message: 'Seed failed' }, { status: 500 });
  }
}
