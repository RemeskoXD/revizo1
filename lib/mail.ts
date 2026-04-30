// @ts-nocheck
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  meta?: {
    type?: string;
    orderId?: string;
    userId?: string;
  };
};

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

let transporter: any = null;

function getTransporter(): any {
  if (!smtpConfigured()) return null;
  if (transporter) return transporter;

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1';

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function logEmail(
  to: string,
  subject: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  messageId?: string,
  error?: string,
  meta?: SendMailOptions['meta']
) {
  try {
    await prisma.emailLog.create({
      data: {
        to,
        subject,
        type: meta?.type || guessType(subject),
        status,
        messageId: messageId || null,
        error: error || null,
        orderId: meta?.orderId || null,
        userId: meta?.userId || null,
      },
    });
  } catch (e) {
    console.error('[mail] Failed to log email:', e);
  }
}

function guessType(subject: string): string {
  if (subject.includes('Objednávka') && subject.includes('přijata')) return 'ORDER_CONFIRMATION';
  if (subject.includes('vyprší')) return 'EXPIRY_WARNING';
  if (subject.includes('expirovala')) return 'EXPIRY_EXPIRED';
  if (subject.includes('Objednávka #')) return 'ORDER_STATUS';
  return 'GENERAL';
}

export async function sendMail(
  options: SendMailOptions
): Promise<{ sent: boolean; reason?: string; messageId?: string }> {
  const toStr = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const transport = getTransporter();

  if (!transport) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[mail] SMTP not configured:', options.subject, '→', toStr);
    }
    await logEmail(toStr, options.subject, 'SKIPPED', undefined, 'SMTP not configured', options.meta);
    return { sent: false, reason: 'not_configured' };
  }

  const from = process.env.SMTP_FROM as string;

  try {
    const info = await transport.sendMail({
      from,
      to: toStr,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    });

    await logEmail(toStr, options.subject, 'SENT', info.messageId, undefined, options.meta);
    return { sent: true, messageId: info.messageId };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('[mail] Send failed:', errMsg);
    await logEmail(toStr, options.subject, 'FAILED', undefined, errMsg, options.meta);
    return { sent: false, reason: errMsg };
  }
}

export function isSmtpEnabled(): boolean {
  return smtpConfigured();
}
