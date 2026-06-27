import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { env } from 'process';

function czAccountToIban(account: string): string | null {
  try {
    const clean = account.replace(/\s/g, '');
    if (clean.startsWith('CZ') && clean.length === 24) return clean;

    const match = clean.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
    if (!match) return null;

    const prefix = match[1] ? match[1].padStart(6, '0') : '000000';
    const accNumber = match[2].padStart(10, '0');
    const bankCode = match[3];

    const bban = `${bankCode}${prefix}${accNumber}`;
    const checkString = `${bban}123500`;
    
    const mod = BigInt(checkString) % BigInt(97);
    const checkDigits = (BigInt(98) - mod).toString().padStart(2, '0');

    return `CZ${checkDigits}${bankCode}${prefix}${accNumber}`;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'TECHNICIAN' && session.user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        technicianId: session.user.id
      },
      include: {
        customer: true,
      }
    });

    if (!order || !order.customer?.email) {
      return NextResponse.json({ message: 'Invoice or customer email not found' }, { status: 404 });
    }

    const technician = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://revizone.cz';
    const invoiceLink = `${baseUrl}/technician/job/${order.readableId}/invoice`;

    let qrCodeHtml = '';
    const iban = czAccountToIban(technician?.bankAccount || '');
    if (iban && order.price) {
      // Create SVG via simple string representation or use an image link for qr generator. 
      // Using an external API for the email is the most reliable way since most email clients block SVG.
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=` + encodeURIComponent(`SPD*1.0*ACC:${iban}*AM:${order.price}*CC:CZK*MSG:Za zakazku ${order.readableId}*X-VS:${order.readableId.replace(/\\D/g, '')}`);
      qrCodeHtml = `
        <div style="margin-top: 20px; text-align: center;">
          <p style="font-size: 14px; color: #555;">Pro rychlou platbu můžete naskenovat tento QR kód:</p>
          <img src="${qrUrl}" alt="QR Platba" width="150" height="150" style="border: 1px solid #eee; padding: 10px; border-radius: 8px;"/>
        </div>
      `;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #000;">Upomínka platby k faktuře #${order.readableId}</h2>
        <p>Dobrý den,</p>
        <p>dovolujeme si Vám připomenout, že evidujeme neuhrazenou fakturu za revizní služby (objednávka <strong>${order.readableId}</strong>).</p>
        <p>Částka k úhradě: <strong>${order.price?.toLocaleString('cs-CZ')} Kč</strong></p>
        <p>Odkaz na fakturu a další detaily naleznete zde:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invoiceLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Zobrazit fakturu
          </a>
        </div>
        ${qrCodeHtml}
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          Pokud jste již fakturu uhradili, považujte prosím tuto zprávu za bezpředmětnou.
        </p>
        <p>S pozdravem,<br/>${technician?.name || 'Váš revizní technik'}</p>
      </div>
    `;

    await sendMail({
      to: order.customer.email,
      subject: `Upomínka platby - Faktura k zakázce #${order.readableId}`,
      html: htmlContent
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Error sending reminder' }, { status: 500 });
  }
}
