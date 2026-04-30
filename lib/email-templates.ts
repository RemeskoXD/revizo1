const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden">
  <tr><td style="padding:32px 40px 20px;text-align:center">
    <div style="display:inline-block;background:#facc15;border-radius:10px;padding:10px 12px">
      <span style="color:#000;font-weight:900;font-size:18px">R</span>
    </div>
    <h1 style="color:#fff;font-size:22px;margin:16px 0 0;font-weight:700">Revizone</h1>
  </td></tr>
  <tr><td style="padding:0 40px 32px">
    ${content}
  </td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
    <p style="color:#666;font-size:12px;margin:0">
      Tento e-mail byl odeslán z platformy Revizone.<br>
      <a href="${baseUrl}/dashboard/settings" style="color:#facc15;text-decoration:none">Správa e-mailových upozornění</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function button(text: string, url: string, color = '#facc15', textColor = '#000'): string {
  return `<a href="${url}" style="display:inline-block;background:${color};color:${textColor};font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin:8px 0">${text}</a>`;
}

export function orderConfirmationEmail(order: {
  readableId: string;
  serviceType: string;
  address: string;
  price: number | null;
  preferredDate: string | null;
  isUrgent?: boolean;
  cancelToken: string;
}) {
  const priceText = order.price ? `${order.price.toLocaleString('cs-CZ')} Kč` : 'Dle ceníku';
  const dateText = order.preferredDate
    ? new Date(order.preferredDate).toLocaleDateString('cs-CZ')
    : 'Dle domluvy';
  const urgentLine =
    order.isUrgent === true
      ? `<tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Termín</span><br>
        <span style="color:#f87171;font-size:15px;font-weight:600">Urgentní (+ zahrnutý příplatek v ceně)</span>
      </td></tr>`
      : '';

  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Objednávka přijata</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Děkujeme za vaši objednávku. Zde jsou detaily:</p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.05);margin-bottom:24px">
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Číslo objednávky</span><br>
        <span style="color:#facc15;font-size:16px;font-weight:700;font-family:monospace">#${order.readableId}</span>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Typ revize</span><br>
        <span style="color:#fff;font-size:15px;font-weight:600">${order.serviceType}</span>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Adresa</span><br>
        <span style="color:#fff;font-size:15px">${order.address}</span>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Preferovaný termín</span><br>
        <span style="color:#fff;font-size:15px">${dateText}</span>
        <span style="color:#888;font-size:12px;display:block;margin-top:6px">Technik termín potvrdí nebo navrhne jiný po domluvě.</span>
      </td></tr>
      ${urgentLine}
      <tr><td style="padding:16px 20px">
        <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Cena</span><br>
        <span style="color:#facc15;font-size:20px;font-weight:700">${priceText}</span>
      </td></tr>
    </table>

    <div style="text-align:center;margin:24px 0">
      ${button('Zobrazit objednávku', `${baseUrl}/dashboard/orders/${order.readableId}`)}
    </div>

    <div style="background:rgba(250,204,21,0.05);border:1px solid rgba(250,204,21,0.15);border-radius:10px;padding:16px 20px;margin:24px 0">
      <p style="color:#facc15;font-size:13px;font-weight:600;margin:0 0 4px">Platba bude zpřístupněna online</p>
      <p style="color:#999;font-size:12px;margin:0">Odkaz na platbu obdržíte e-mailem, jakmile bude aktivní online platební brána.</p>
    </div>

    <p style="color:#666;font-size:13px;margin:24px 0 0;text-align:center">
      Chcete objednávku zrušit nebo upravit?<br>
      <a href="${baseUrl}/dashboard/orders/${order.readableId}?action=manage&token=${order.cancelToken}" style="color:#facc15;text-decoration:none;font-weight:600">Spravovat objednávku</a>
    </p>
  `);

  return {
    subject: `Objednávka #${order.readableId} přijata – Revizone`,
    html,
  };
}

export function expiryWarningEmail(data: {
  userName: string;
  serviceType: string;
  address: string;
  readableId: string;
  daysLeft: number;
  expiresAt: string;
}) {
  const urgencyColor = data.daysLeft <= 2 ? '#ef4444' : data.daysLeft <= 7 ? '#f97316' : '#facc15';
  const urgencyBg = data.daysLeft <= 2 ? 'rgba(239,68,68,0.05)' : data.daysLeft <= 7 ? 'rgba(249,115,22,0.05)' : 'rgba(250,204,21,0.05)';
  const urgencyBorder = data.daysLeft <= 2 ? 'rgba(239,68,68,0.2)' : data.daysLeft <= 7 ? 'rgba(249,115,22,0.2)' : 'rgba(250,204,21,0.2)';

  const html = layout(`
    <div style="background:${urgencyBg};border:1px solid ${urgencyBorder};border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="color:${urgencyColor};font-size:32px;font-weight:900;margin:0">${data.daysLeft}</p>
      <p style="color:${urgencyColor};font-size:14px;font-weight:600;margin:4px 0 0">${data.daysLeft === 1 ? 'den do expirace revize' : 'dní do expirace revize'}</p>
    </div>

    <h2 style="color:#fff;font-size:18px;margin:0 0 8px">Dobrý den, ${data.userName}</h2>
    <p style="color:#999;font-size:14px;margin:0 0 20px">
      Vaše revize se blíží ke konci platnosti. Doporučujeme objednat novou revizi co nejdříve, aby váš objekt zůstal v bezpečí.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.05);margin-bottom:24px">
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px">Revize</span><br>
        <span style="color:#fff;font-size:15px;font-weight:600">${data.serviceType}</span>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px">Adresa</span><br>
        <span style="color:#fff;font-size:15px">${data.address}</span>
      </td></tr>
      <tr><td style="padding:16px 20px">
        <span style="color:#999;font-size:12px">Platnost do</span><br>
        <span style="color:${urgencyColor};font-size:15px;font-weight:700">${new Date(data.expiresAt).toLocaleDateString('cs-CZ')}</span>
      </td></tr>
    </table>

    <div style="text-align:center">
      ${button('Objednat novou revizi', `${baseUrl}/dashboard/new-order`, urgencyColor, urgencyColor === '#facc15' ? '#000' : '#fff')}
    </div>
  `);

  return {
    subject: `⚠️ Revize ${data.serviceType} vyprší za ${data.daysLeft} ${data.daysLeft === 1 ? 'den' : 'dní'} – Revizone`,
    html,
  };
}

export function expiryExpiredEmail(data: {
  userName: string;
  serviceType: string;
  address: string;
  readableId: string;
  expiredDaysAgo: number;
}) {
  const html = layout(`
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="color:#ef4444;font-size:28px;font-weight:900;margin:0">REVIZE EXPIROVALA</p>
      <p style="color:#ef4444;font-size:13px;margin:8px 0 0">Před ${data.expiredDaysAgo} ${data.expiredDaysAgo === 1 ? 'dnem' : 'dny'}</p>
    </div>

    <h2 style="color:#fff;font-size:18px;margin:0 0 8px">Dobrý den, ${data.userName}</h2>
    <p style="color:#999;font-size:14px;margin:0 0 20px">
      Platnost vaší revize <strong style="color:#fff">${data.serviceType}</strong> na adrese <strong style="color:#fff">${data.address}</strong> vypršela.
      Bez platné revize může být váš objekt nebezpečný a hrozí sankce při kontrole.
    </p>

    <div style="text-align:center;margin:24px 0">
      ${button('Objednat novou revizi ihned', `${baseUrl}/dashboard/new-order`, '#ef4444', '#fff')}
    </div>

    <p style="color:#666;font-size:12px;text-align:center;margin:16px 0 0">
      Pokud jste revizi již objednali jinde, můžete ji nahrát do systému v sekci 
      <a href="${baseUrl}/dashboard" style="color:#facc15;text-decoration:none">Přehled</a>.
    </p>
  `);

  return {
    subject: `🔴 Revize ${data.serviceType} expirovala! – Revizone`,
    html,
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string; description: string }> = {
  PENDING: { label: 'Čeká na vyřízení', color: '#eab308', emoji: '⏳', description: 'Vaše objednávka čeká na přiřazení technika.' },
  IN_PROGRESS: { label: 'Probíhá', color: '#3b82f6', emoji: '🔧', description: 'Technik na vaší revizi pracuje.' },
  COMPLETED: { label: 'Dokončeno', color: '#22c55e', emoji: '✅', description: 'Revize byla úspěšně dokončena. Zpráva je připravena ke stažení.' },
  CANCELLED: { label: 'Zrušeno', color: '#ef4444', emoji: '❌', description: 'Vaše objednávka byla zrušena.' },
  NEEDS_REVISION: { label: 'K přepracování', color: '#f97316', emoji: '🔄', description: 'Revize vyžaduje přepracování nebo doplnění.' },
};

export function orderStatusEmail(data: {
  readableId: string;
  serviceType: string;
  address: string;
  newStatus: string;
  technicianName?: string | null;
  scheduledDate?: string | null;
  customerName?: string | null;
}) {
  const cfg = STATUS_CONFIG[data.newStatus] || STATUS_CONFIG.PENDING;

  const extraInfo = [];
  if (data.technicianName) {
    extraInfo.push(`<tr><td style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="color:#999;font-size:12px">Technik</span><br>
      <span style="color:#fff;font-size:15px;font-weight:600">${data.technicianName}</span>
    </td></tr>`);
  }
  if (data.scheduledDate) {
    extraInfo.push(`<tr><td style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="color:#999;font-size:12px">Naplánovaný termín</span><br>
      <span style="color:#fff;font-size:15px;font-weight:600">${new Date(data.scheduledDate).toLocaleDateString('cs-CZ')}</span>
    </td></tr>`);
  }

  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Změna stavu objednávky</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.customerName ? `, ${data.customerName}` : ''}. Stav vaší objednávky se změnil.</p>

    <div style="background:${cfg.color}15;border:1px solid ${cfg.color}40;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">${cfg.emoji}</p>
      <p style="color:${cfg.color};font-size:18px;font-weight:700;margin:8px 0 4px">${cfg.label}</p>
      <p style="color:#999;font-size:13px;margin:0">${cfg.description}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.05);margin-bottom:24px">
      <tr><td style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px">Číslo objednávky</span><br>
        <span style="color:#facc15;font-size:16px;font-weight:700;font-family:monospace">#${data.readableId}</span>
      </td></tr>
      <tr><td style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px">Typ revize</span><br>
        <span style="color:#fff;font-size:15px;font-weight:600">${data.serviceType}</span>
      </td></tr>
      <tr><td style="padding:12px 20px${extraInfo.length > 0 ? ';border-bottom:1px solid rgba(255,255,255,0.05)' : ''}">
        <span style="color:#999;font-size:12px">Adresa</span><br>
        <span style="color:#fff;font-size:15px">${data.address}</span>
      </td></tr>
      ${extraInfo.join('')}
    </table>

    <div style="text-align:center">
      ${button('Zobrazit objednávku', `${baseUrl}/dashboard/orders/${data.readableId}`)}
    </div>
  `);

  return {
    subject: `${cfg.emoji} Objednávka #${data.readableId}: ${cfg.label} – Revizone`,
    html,
  };
}

export function registrationApprovedEmail(params: {
  name: string | null;
  roleLabel: string;
  /** Platnost oprávnění k provádění revizí (datum včetně). */
  validUntilLabel: string;
}) {
  const loginUrl = `${baseUrl.replace(/\/$/, '')}/login`;
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Registrace byla schválena</h2>
    <p style="color:#999;font-size:14px;margin:0 0 16px">Dobrý den${params.name ? `, ${params.name}` : ''},</p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px">
      Vaše registrace jako <strong style="color:#fff">${params.roleLabel}</strong> byla administrátorem <strong style="color:#facc15">schválena</strong>.
      Po přihlášení prosím v aplikaci dokončete roční předplatné (první měsíc od registrace máte zdarma).
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin:0 0 24px">
      <tr><td style="padding:16px 20px">
        <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Platnost oprávnění k revizím do</span><br>
        <span style="color:#facc15;font-size:18px;font-weight:700">${params.validUntilLabel}</span>
        <p style="color:#888;font-size:12px;margin:8px 0 0;line-height:1.4">Po tomto datu bude potřeba obnovení u administrátora Revizone.</p>
      </td></tr>
    </table>
    <p style="margin:0 0 8px">${button('Přihlásit se', loginUrl)}</p>
  `);
  return {
    subject: 'Revizone – registrace schválena',
    html,
    text: `Registrace jako ${params.roleLabel} byla schválena. Po přihlášení dokončete roční předplatné v aplikaci. Platnost oprávnění k revizím do ${params.validUntilLabel}. Přihlášení: ${loginUrl}`,
  };
}

export function registrationRejectedEmail(params: { name: string | null }) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Registrace nebyla schválena</h2>
    <p style="color:#999;font-size:14px;margin:0 0 16px">Dobrý den${params.name ? `, ${params.name}` : ''},</p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px">
      Vaše registrace v systému Revizone bohužel <strong style="color:#f87171">nebyla schválena</strong>.
      Pro více informací nás můžete kontaktovat na podporu.
    </p>
  `);
  return {
    subject: 'Revizone – registrace zamítnuta',
    html,
    text: 'Vaše registrace nebyla schválena. Pro více informací kontaktujte podporu.',
  };
}
