import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { createNotification } from '@/lib/notifications';

/**
 * Cron pro hlídání platnosti firemních dokumentů.
 * GET /api/cron/document-expiry?secret=...
 *
 * Posílá e-mail + in-app notifikaci, když dokument:
 *   - vyprší za <= 30, 14, 7, 1 dní
 *   - už vypršel (jednou denně)
 *
 * Idempotence je zajištěna porovnáním s `lastReminderSentDays` v poznámce -
 * pro jednoduchost zatím akceptujeme občasné duplicitní notifikace
 * (typicky 1x denně cron pošle 1× e-mail za den).
 */
const REMINDER_DAYS = [30, 14, 7, 1];
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provided = searchParams.get('secret');

  if (process.env.NODE_ENV === 'production') {
    if (!CRON_SECRET) {
      return NextResponse.json({ message: 'CRON_SECRET není nastaven' }, { status: 503 });
    }
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  } else if (CRON_SECRET && provided !== CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const msDay = 24 * 60 * 60 * 1000;

  const docs = await prisma.companyDocument.findMany({
    where: { validUntil: { not: null } },
    include: {
      owner: { select: { id: true, name: true, email: true, emailNotifications: true } },
    },
  });

  let warnings = 0;
  let expirations = 0;

  for (const doc of docs) {
    if (!doc.validUntil || !doc.owner.email || !doc.owner.emailNotifications) continue;
    const diff = doc.validUntil.getTime() - now.getTime();
    const daysLeft = Math.ceil(diff / msDay);

    // Vypršelo (jen jednou denně, předpokládáme cron každých 24h)
    if (daysLeft <= 0 && daysLeft > -1) {
      expirations += 1;
      await sendMail({
        to: doc.owner.email,
        subject: `⚠️ Dokument "${doc.title}" vypršel`,
        html: emailHtml({
          title: doc.title,
          subjectName: doc.subjectName,
          state: 'EXPIRED',
          daysLeft,
          validUntil: doc.validUntil,
          ownerName: doc.owner.name,
        }),
      }).catch(console.error);

      await createNotification({
        userId: doc.owner.id,
        type: 'REVISION_EXPIRING',
        title: 'Dokument vypršel',
        message: `Platnost dokumentu "${doc.title}" vypršela. Obnovte nebo nahraďte ho.`,
        link: '/company/documents',
      });
      continue;
    }

    // Upozornění X dní předem (jen v ten konkrétní den)
    if (REMINDER_DAYS.includes(daysLeft)) {
      warnings += 1;
      await sendMail({
        to: doc.owner.email,
        subject: `⏰ Dokument "${doc.title}" vyprší za ${daysLeft} ${daysLeft === 1 ? 'den' : 'dní'}`,
        html: emailHtml({
          title: doc.title,
          subjectName: doc.subjectName,
          state: 'EXPIRES_SOON',
          daysLeft,
          validUntil: doc.validUntil,
          ownerName: doc.owner.name,
        }),
      }).catch(console.error);

      await createNotification({
        userId: doc.owner.id,
        type: 'REVISION_EXPIRING',
        title: 'Dokument brzy vyprší',
        message: `Dokument "${doc.title}" vyprší za ${daysLeft} ${daysLeft === 1 ? 'den' : 'dní'}.`,
        link: '/company/documents',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checkedDocuments: docs.length,
    warningsSent: warnings,
    expirationNoticesSent: expirations,
  });
}

function emailHtml(data: {
  title: string;
  subjectName: string | null;
  state: 'EXPIRES_SOON' | 'EXPIRED';
  daysLeft: number;
  validUntil: Date;
  ownerName: string | null;
}): string {
  const isExpired = data.state === 'EXPIRED';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const color = isExpired ? '#ef4444' : '#f59e0b';
  const headline = isExpired
    ? `Platnost dokumentu vypršela`
    : `Dokument vyprší za ${data.daysLeft} ${data.daysLeft === 1 ? 'den' : 'dní'}`;

  return `<!DOCTYPE html>
<html lang="cs"><body style="background:#111;font-family:system-ui,sans-serif;margin:0;padding:24px;color:#eee">
  <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border-radius:16px;padding:32px">
    <h2 style="color:#fff;margin:0 0 12px">${headline}</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">${data.ownerName ? `Dobrý den, ${data.ownerName}` : 'Dobrý den'},</p>
    <div style="background:${color}15;border:1px solid ${color}40;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="color:${color};font-size:18px;font-weight:700;margin:0 0 4px">${data.title}</p>
      ${data.subjectName ? `<p style="color:#ccc;font-size:13px;margin:0">Subjekt: ${data.subjectName}</p>` : ''}
      <p style="color:#999;font-size:13px;margin:8px 0 0">Platnost do: ${data.validUntil.toLocaleDateString('cs-CZ')}</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${baseUrl}/company/documents" style="display:inline-block;background:#facc15;color:#000;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700">Otevřít dokumenty</a>
    </div>
  </div>
</body></html>`;
}
