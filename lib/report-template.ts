export type ReportData = {
  orderReadableId: string;
  serviceType: string;
  propertyType: string;
  address: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  technicianName: string;
  technicianCert: string;
  technicianPhone: string;
  revisionDate: string;
  nextRevisionDate: string;
  result: 'PASS' | 'PASS_WITH_NOTES' | 'FAIL';
  standards: string;
  checkpoints: { name: string; result: 'ok' | 'fail' | 'na'; note: string }[];
  measurements: { name: string; value: string; unit: string; limit: string; ok: boolean }[];
  defects: { description: string; severity: 'low' | 'medium' | 'high'; fixed: boolean }[];
  notes: string;
  conclusion: string;
};

const RESULT_LABELS = {
  PASS: { text: 'BEZ ZÁVAD – SCHOPNO PROVOZU', color: '#22c55e' },
  PASS_WITH_NOTES: { text: 'S VÝHRADAMI – VIZ POZNÁMKY', color: '#f97316' },
  FAIL: { text: 'NEVYHOVUJE – NEPOUŽÍVAT', color: '#ef4444' },
};

export function generateReportHtml(data: ReportData): string {
  const resultCfg = RESULT_LABELS[data.result];

  const checkpointRows = data.checkpoints.map(cp => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #ddd">${cp.name}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-weight:700;color:${cp.result === 'ok' ? '#22c55e' : cp.result === 'fail' ? '#ef4444' : '#999'}">
        ${cp.result === 'ok' ? '✓ OK' : cp.result === 'fail' ? '✗ ZÁVADA' : '— N/A'}
      </td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-size:12px;color:#666">${cp.note || ''}</td>
    </tr>
  `).join('');

  const measurementRows = data.measurements.map(m => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #ddd">${m.name}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;font-weight:600">${m.value} ${m.unit}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;color:#666">${m.limit} ${m.unit}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;font-weight:700;color:${m.ok ? '#22c55e' : '#ef4444'}">${m.ok ? '✓' : '✗'}</td>
    </tr>
  `).join('');

  const defectRows = data.defects.map((d, i) => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:6px 12px;border:1px solid #ddd">${d.description}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;color:${d.severity === 'high' ? '#ef4444' : d.severity === 'medium' ? '#f97316' : '#eab308'}">
        ${d.severity === 'high' ? 'Vysoká' : d.severity === 'medium' ? 'Střední' : 'Nízká'}
      </td>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${d.fixed ? '✓ Ano' : '✗ Ne'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<title>Revizní zpráva #${data.orderReadableId}</title>
<style>
  @page { size: A4; margin: 20mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; font-size: 13px; line-height: 1.5; margin: 0; padding: 0; }
  h1, h2, h3 { margin: 0; }
  table { border-collapse: collapse; width: 100%; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #facc15;padding-bottom:16px;margin-bottom:24px">
  <div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="background:#facc15;border-radius:8px;padding:6px 10px;font-weight:900;font-size:20px;color:#000">R</div>
      <h1 style="font-size:24px;font-weight:800;color:#111">REVIZONE</h1>
    </div>
    <p style="font-size:11px;color:#666">Platforma pro správu revizí a technických kontrol</p>
  </div>
  <div style="text-align:right">
    <h2 style="font-size:18px;color:#111;margin-bottom:4px">REVIZNÍ ZPRÁVA</h2>
    <p style="font-size:12px;color:#666;font-family:monospace">#${data.orderReadableId}</p>
    <p style="font-size:12px;color:#666">${data.revisionDate}</p>
  </div>
</div>

<!-- Result Banner -->
<div style="background:${resultCfg.color}15;border:2px solid ${resultCfg.color};border-radius:10px;padding:16px;text-align:center;margin-bottom:24px">
  <p style="font-size:20px;font-weight:900;color:${resultCfg.color};margin:0;letter-spacing:1px">${resultCfg.text}</p>
</div>

<!-- Info Grid -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
  <div style="background:#f8f8f8;border-radius:8px;padding:16px">
    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px">Objekt</h3>
    <p style="font-weight:600;margin-bottom:4px">${data.serviceType}</p>
    <p style="color:#666;font-size:12px;margin-bottom:2px">${data.propertyType}</p>
    <p style="color:#666;font-size:12px">${data.address}</p>
  </div>
  <div style="background:#f8f8f8;border-radius:8px;padding:16px">
    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px">Objednatel</h3>
    <p style="font-weight:600;margin-bottom:4px">${data.customerName}</p>
    <p style="color:#666;font-size:12px;margin-bottom:2px">${data.customerPhone}</p>
    <p style="color:#666;font-size:12px">${data.customerEmail}</p>
  </div>
  <div style="background:#f8f8f8;border-radius:8px;padding:16px">
    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px">Revizní technik</h3>
    <p style="font-weight:600;margin-bottom:4px">${data.technicianName}</p>
    <p style="color:#666;font-size:12px;margin-bottom:2px">Oprávnění: ${data.technicianCert}</p>
    <p style="color:#666;font-size:12px">Tel: ${data.technicianPhone}</p>
  </div>
  <div style="background:#f8f8f8;border-radius:8px;padding:16px">
    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px">Termíny</h3>
    <p style="color:#666;font-size:12px;margin-bottom:4px">Datum revize: <strong style="color:#111">${data.revisionDate}</strong></p>
    <p style="color:#666;font-size:12px;margin-bottom:4px">Další revize: <strong style="color:#111">${data.nextRevisionDate}</strong></p>
    <p style="color:#666;font-size:12px">Norma: ${data.standards}</p>
  </div>
</div>

<!-- Checkpoints -->
${data.checkpoints.length > 0 ? `
<h3 style="font-size:15px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #eee">Kontrolní body</h3>
<table style="margin-bottom:24px">
  <thead>
    <tr style="background:#f0f0f0">
      <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;width:40%">Kontrolní bod</th>
      <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;width:15%">Výsledek</th>
      <th style="padding:8px 12px;border:1px solid #ddd;text-align:left">Poznámka</th>
    </tr>
  </thead>
  <tbody>${checkpointRows}</tbody>
</table>
` : ''}

<!-- Measurements -->
${data.measurements.length > 0 ? `
<h3 style="font-size:15px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #eee">Naměřené hodnoty</h3>
<table style="margin-bottom:24px">
  <thead>
    <tr style="background:#f0f0f0">
      <th style="padding:6px 12px;border:1px solid #ddd;text-align:left">Veličina</th>
      <th style="padding:6px 12px;border:1px solid #ddd;text-align:center">Naměřeno</th>
      <th style="padding:6px 12px;border:1px solid #ddd;text-align:center">Limit</th>
      <th style="padding:6px 12px;border:1px solid #ddd;text-align:center;width:10%">OK</th>
    </tr>
  </thead>
  <tbody>${measurementRows}</tbody>
</table>
` : ''}

<!-- Defects -->
${data.defects.length > 0 ? `
<h3 style="font-size:15px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #ef4444">Zjištěné závady</h3>
<table style="margin-bottom:24px">
  <thead>
    <tr style="background:#fef2f2">
      <th style="padding:6px 12px;border:1px solid #ddd;width:5%">#</th>
      <th style="padding:6px 12px;border:1px solid #ddd;text-align:left">Popis závady</th>
      <th style="padding:6px 12px;border:1px solid #ddd;text-align:center;width:15%">Závažnost</th>
      <th style="padding:6px 12px;border:1px solid #ddd;text-align:center;width:15%">Odstraněno</th>
    </tr>
  </thead>
  <tbody>${defectRows}</tbody>
</table>
` : ''}

<!-- Notes & Conclusion -->
${data.notes ? `
<h3 style="font-size:15px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #eee">Poznámky technika</h3>
<div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-bottom:24px;white-space:pre-wrap;font-size:12px">${data.notes}</div>
` : ''}

<h3 style="font-size:15px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #eee">Závěr</h3>
<div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-bottom:32px;white-space:pre-wrap">${data.conclusion || `Na základě provedené revize je zařízení / instalace vyhodnocena jako: ${resultCfg.text}.`}</div>

<!-- Signatures -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px;padding-top:20px">
  <div style="text-align:center">
    <div style="border-bottom:1px solid #ccc;height:60px;margin-bottom:8px"></div>
    <p style="font-size:12px;color:#666">Revizní technik: ${data.technicianName}</p>
    <p style="font-size:11px;color:#999">Datum: ${data.revisionDate}</p>
  </div>
  <div style="text-align:center">
    <div style="border-bottom:1px solid #ccc;height:60px;margin-bottom:8px"></div>
    <p style="font-size:12px;color:#666">Objednatel: ${data.customerName}</p>
    <p style="font-size:11px;color:#999">Datum: ${data.revisionDate}</p>
  </div>
</div>

<!-- Footer -->
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center">
  <p style="font-size:10px;color:#999">Dokument vygenerován platformou Revizone · www.revizone.cz · #${data.orderReadableId}</p>
</div>

</body>
</html>`;
}
