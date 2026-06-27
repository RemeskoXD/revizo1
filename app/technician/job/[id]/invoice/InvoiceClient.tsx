'use client';

import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import Link from 'next/link';

// Jednoduchý konvertor českého čísla účtu na IBAN
function czAccountToIban(account: string): string | null {
  try {
    const clean = account.replace(/\s/g, '');
    if (clean.startsWith('CZ') && clean.length === 24) return clean; // Už je to IBAN

    const match = clean.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
    if (!match) return null;

    const prefix = match[1] ? match[1].padStart(6, '0') : '000000';
    const accNumber = match[2].padStart(10, '0');
    const bankCode = match[3];

    const bban = `${bankCode}${prefix}${accNumber}`;
    // CZ je 12, 35
    const checkString = `${bban}123500`;
    
    // Modulo 97 pro velká čísla
    const mod = BigInt(checkString) % BigInt(97);
    const checkDigits = (BigInt(98) - mod).toString().padStart(2, '0');

    return `CZ${checkDigits}${bankCode}${prefix}${accNumber}`;
  } catch (e) {
    return null;
  }
}

export default function InvoiceClient({ order, biller, customer }: { order: any, biller: any, customer: any }) {
  const account = biller?.bankAccount || '';
  const iban = czAccountToIban(account) || '';
  const amount = order.price || 0;
  
  // SPAYD format pro platbu v CZK
  const vs = order.readableId.replace(/\D/g, ''); // variabilní symbol = ID objednávky bez písmen, nebo rovnou readableId pokud je číslo
  const spayd = iban ? `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK*MSG:Za zakazku ${order.readableId}*X-VS:${vs}` : '';

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 text-black print:p-0">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <Link href={`/technician/job/${order.readableId}`} className="text-gray-500 hover:text-black flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Zpět na zakázku
        </Link>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
            <Printer className="w-4 h-4" /> Tisk
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-8 sm:p-12 shadow-sm print:shadow-none print:border-none">
        <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Faktura</h1>
            <p className="text-gray-500">Číslo: {order.readableId}</p>
            <p className="text-gray-500">Datum vystavení: {new Date().toLocaleDateString('cs-CZ')}</p>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-lg">{biller?.name || 'Dodavatel'}</h2>
            <p className="text-gray-600 mt-1">{biller?.address || 'Adresa nedoplněna'}</p>
            {biller?.ico && <p className="text-gray-600">IČO: {biller.ico}</p>}
            {biller?.phone && <p className="text-gray-600">{biller.phone}</p>}
            <p className="text-gray-600">{biller?.email}</p>
          </div>
        </div>

        <div className="flex justify-between items-start mb-12">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Odběratel</h3>
            <h2 className="font-bold text-lg">{customer.name || customer.email}</h2>
            {customer.address && <p className="text-gray-600 mt-1">{customer.address}</p>}
            {customer.ico && <p className="text-gray-600 mt-1">IČO: {customer.ico}</p>}
            {customer.phone && <p className="text-gray-600 mt-1">{customer.phone}</p>}
          </div>
          <div className="bg-gray-50 p-6 rounded-lg text-right min-w-[200px]">
            <p className="text-sm text-gray-500 mb-1">K úhradě</p>
            <p className="text-3xl font-bold">{amount.toLocaleString('cs-CZ')} Kč</p>
          </div>
        </div>

        <table className="w-full mb-12">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-500">
              <th className="pb-3">Popis položky</th>
              <th className="pb-3 text-right">Částka</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-4 font-medium">{order.serviceType} - {order.propertyType}</td>
              <td className="py-4 text-right font-medium">{amount.toLocaleString('cs-CZ')} Kč</td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-6 rounded-xl border border-gray-200 gap-8 print:break-inside-avoid">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-4">Platební údaje</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Číslo účtu:</span>
                <span className="font-bold">{account || 'Není zadáno v profilu dodavatele'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Banka:</span>
                <span className="font-medium">Kód banky {account?.split('/')[1] || ''}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Variabilní symbol:</span>
                <span className="font-bold">{vs}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-gray-500">Částka:</span>
                <span className="font-bold text-lg">{amount.toLocaleString('cs-CZ')} Kč</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            {spayd ? (
              <div className="text-center">
                <QRCodeSVG value={spayd} size={150} level="M" includeMargin={true} />
                <p className="text-xs text-gray-500 mt-2 font-medium">QR Platba</p>
              </div>
            ) : (
              <div className="w-[150px] h-[150px] flex items-center justify-center bg-gray-100 text-gray-400 text-sm text-center p-4">
                Pro QR kód doplňte číslo účtu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
