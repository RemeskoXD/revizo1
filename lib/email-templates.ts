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
  paymentUrl?: string | null;
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
      ${order.paymentUrl ? `<br>${button('Zaplatit online nyní', order.paymentUrl, '#22c55e', '#fff')}` : ''}
    </div>

    ${!order.paymentUrl ? `<div style="background:rgba(250,204,21,0.05);border:1px solid rgba(250,204,21,0.15);border-radius:10px;padding:16px 20px;margin:24px 0">
      <p style="color:#facc15;font-size:13px;font-weight:600;margin:0 0 4px">Platba bude zpřístupněna online</p>
      <p style="color:#999;font-size:12px;margin:0">Odkaz na platbu obdržíte e-mailem, jakmile bude aktivní online platební brána.</p>
    </div>` : ''}

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
      <span style="color:#999;font-size:12px">Revizní technik</span><br>
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

export function paymentSuccessEmail(data: {
  userName: string | null;
  serviceType: string;
  price: number;
  readableId: string;
}) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Platba byla přijata</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.userName ? `, ${data.userName}` : ''},</p>
    
    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">✅</p>
      <p style="color:#22c55e;font-size:18px;font-weight:700;margin:8px 0 4px">Platba za revizi proběhla úspěšně</p>
      <p style="color:#999;font-size:13px;margin:0">Částka ${data.price.toLocaleString('cs-CZ')} Kč byla uhrazena.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.05);margin-bottom:24px">
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#999;font-size:12px">Číslo objednávky</span><br>
        <span style="color:#facc15;font-size:16px;font-weight:700;font-family:monospace">#${data.readableId}</span>
      </td></tr>
      <tr><td style="padding:16px 20px">
        <span style="color:#999;font-size:12px">Položka</span><br>
        <span style="color:#fff;font-size:15px;font-weight:600">${data.serviceType}</span>
      </td></tr>
    </table>

    <div style="text-align:center;margin:24px 0">
      ${button('Zobrazit objednávku', `${baseUrl}/dashboard/orders/${data.readableId}`)}
    </div>
  `);

  return {
    subject: `✅ Potvrzení platby za objednávku #${data.readableId}`,
    html,
  };
}

export function objectAddonActivatedEmail(data: {
  userName: string | null;
  kind: 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS';
  quantity: number;
  pricePerYearCzk: number;
}) {
  const isPackage = data.kind === 'PACKAGE_10_OBJECTS';
  const title = isPackage ? 'Balíček do 10 objektů byl aktivován' : 'Další objekt byl přidán';
  const detail = isPackage
    ? 'Od nynějška můžete v rámci účtu evidovat až 10 objektů.'
    : `Limit byl navýšen o ${data.quantity} ${data.quantity === 1 ? 'objekt' : data.quantity < 5 ? 'objekty' : 'objektů'}.`;
  const total = isPackage ? data.pricePerYearCzk : data.pricePerYearCzk * Math.max(1, data.quantity);

  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">${title}</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.userName ? `, ${data.userName}` : ''},</p>

    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">✅</p>
      <p style="color:#22c55e;font-size:18px;font-weight:700;margin:8px 0 4px">${title}</p>
      <p style="color:#999;font-size:13px;margin:0">Celkem: ${total.toLocaleString('cs-CZ')} Kč / rok</p>
    </div>

    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px">${detail}</p>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 24px">
      Doplněk se obnovuje ročně. V zákaznickém portálu Stripe můžete předplatné kdykoli zrušit – po
      ukončení se limit vrátí na výchozí hodnotu podle vašeho profilu.
    </p>

    <div style="text-align:center;margin:24px 0">
      ${button('Otevřít přehled', `${baseUrl}/dashboard`)}
    </div>
  `);

  return {
    subject: isPackage
      ? '✅ Aktivováno: balíček do 10 objektů'
      : `✅ Přidán další objekt (${data.quantity})`,
    html,
  };
}

export function objectAddonRevokedEmail(data: {
  userName: string | null;
  kind: 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS';
}) {
  const isPackage = data.kind === 'PACKAGE_10_OBJECTS';
  const title = isPackage
    ? 'Balíček do 10 objektů byl zrušen'
    : 'Předplatné dalších objektů bylo zrušeno';
  const detail = isPackage
    ? 'Váš limit objektů se vrátil na výchozí hodnotu profilu (3 objekty).'
    : 'Limit objektů se vrátil na výchozí hodnotu profilu (1 objekt).';

  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">${title}</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.userName ? `, ${data.userName}` : ''},</p>

    <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">ℹ️</p>
      <p style="color:#f87171;font-size:18px;font-weight:700;margin:8px 0 4px">${title}</p>
    </div>

    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px">${detail}</p>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 24px">
      Pokud jde o nedopatření, doplněk lze znovu aktivovat ve vašem dashboardu.
    </p>

    <div style="text-align:center;margin:24px 0">
      ${button('Aktivovat znovu', `${baseUrl}/dashboard`)}
    </div>
  `);

  return {
    subject: isPackage
      ? 'Balíček do 10 objektů byl zrušen'
      : 'Předplatné dalších objektů bylo zrušeno',
    html,
  };
}

export function referralRewardCreatedEmail(data: {
  realtorName: string | null;
  customerName: string | null;
  amountCzk: number;
}) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Nová referral odměna ${data.amountCzk} Kč</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.realtorName ? `, ${data.realtorName}` : ''},</p>

    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">🎁</p>
      <p style="color:#22c55e;font-size:18px;font-weight:700;margin:8px 0 4px">+${data.amountCzk} Kč</p>
      <p style="color:#999;font-size:13px;margin:0">
        Zákazník${data.customerName ? ` <strong style="color:#fff">${data.customerName}</strong>` : ''} se úspěšně registroval přes váš referral kód.
      </p>
    </div>

    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px">
      Odměna je momentálně ve stavu <strong style="color:#f59e0b">čeká na vyplacení</strong>. Administrátor ji vyplatí v nejbližším účetním období.
    </p>

    <div style="text-align:center;margin:24px 0">
      ${button('Zobrazit odměny', `${baseUrl}/realty/referrals`)}
    </div>
  `);
  return {
    subject: `🎁 Nová referral odměna ${data.amountCzk} Kč`,
    html,
  };
}

export function referralRewardPaidEmail(data: {
  realtorName: string | null;
  amountCzk: number;
}) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Odměna ${data.amountCzk} Kč byla vyplacena</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.realtorName ? `, ${data.realtorName}` : ''},</p>

    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">✅</p>
      <p style="color:#22c55e;font-size:18px;font-weight:700;margin:8px 0 4px">Vyplaceno ${data.amountCzk} Kč</p>
      <p style="color:#999;font-size:13px;margin:0">Administrátor označil vaši referral odměnu jako vyplacenou.</p>
    </div>

    <div style="text-align:center;margin:24px 0">
      ${button('Historie odměn', `${baseUrl}/realty/referrals`)}
    </div>
  `);
  return {
    subject: `✅ Vyplacena referral odměna ${data.amountCzk} Kč`,
    html,
  };
}

export function registrationRejectedEmail(params: { name: string | null; reason?: string | null }) {
  const reasonText = params.reason 
    ? `<div style="background:rgba(239, 68, 68, 0.05); border:1px solid rgba(239, 68, 68, 0.25); border-radius:12px; padding:16px; margin:20px 0; font-size:13px; color:#f87171; text-align:left;">
        <strong style="display:block;margin-bottom:6px;color:#f87171">Důvod zamítnutí zadaný administrátorem:</strong>
        <span style="color:#ccc">${params.reason}</span>
       </div>`
    : '';

  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Registrace nebyla schválena</h2>
    <p style="color:#999;font-size:14px;margin:0 0 16px">Dobrý den${params.name ? `, ${params.name}` : ''},</p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px">
      Vaše registrace v systému Revizone bohužel <strong style="color:#f87171">nebyla schválena</strong>.
    </p>
    ${reasonText}
    <p style="color:#999;font-size:13px;line-height:1.6;margin:16px 0 0">
      Pro více informací nebo nápravu nás můžete kontaktovat přes naši zákaznickou podporu.
    </p>
  `);
  return {
    subject: 'Revizone – registrace nebyla schválena',
    html,
  };
}

export function subscriptionRenewedEmail(data: {
  userName: string | null;
  periodMonths: number;
  validUntil: Date;
}) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Předplatné bylo prodlouženo</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.userName ? ', ' + data.userName : ''},</p>

    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">✅</p>
      <p style="color:#22c55e;font-size:18px;font-weight:700;margin:8px 0 4px">Předplatné úspěšně uhrazeno</p>
      <p style="color:#999;font-size:13px;margin:0">Vaše oprávnění a přístup byly prodlouženy o ${data.periodMonths} měsíců.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.05);margin-bottom:24px">
      <tr><td style="padding:16px 20px">
        <span style="color:#999;font-size:12px">Platnost prodloužena do</span><br>
        <span style="color:#fff;font-size:15px;font-weight:600">${data.validUntil.toLocaleDateString('cs-CZ')}</span>
      </td></tr>
    </table>

    <div style="text-align:center;margin:24px 0">
      ${button('Otevřít přehled', `${baseUrl}/dashboard`)}
    </div>
  `);

  return {
    subject: `✅ Předplatné prodlouženo do ${data.validUntil.toLocaleDateString('cs-CZ')}`,
    html,
  };
}

export function subscriptionPaymentFailedEmail(data: {
  userName: string | null;
  invoiceUrl?: string | null;
}) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Problém s platbou předplatného</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.userName ? ', ' + data.userName : ''},</p>

    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">⚠️</p>
      <p style="color:#ef4444;font-size:18px;font-weight:700;margin:8px 0 4px">Platba se nezdařila</p>
      <p style="color:#999;font-size:13px;margin:0">Nepodařilo se nám automaticky strhnout platbu za vaše předplatné.</p>
    </div>

    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px">
      Zkontrolujte prosím stav vaší platební karty nebo aktualizujte platební metodu v zákaznickém portálu.
    </p>

    <div style="text-align:center;margin:24px 0">
      ${data.invoiceUrl ? button('Zaplatit online', data.invoiceUrl, '#ef4444', '#fff') + '<br>' : ''}
      ${button('Spravovat předplatné', `${baseUrl}/dashboard/settings`)}
    </div>
  `);

  return {
    subject: `⚠️ Platba předplatného se nezdařila`,
    html,
  };
}

export function orderOverdueEmail(data: {
  userName: string | null;
  readableId: string;
  serviceType: string;
  price: number;
  paymentUrl: string;
}) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Upozornění: Revize po splatnosti</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.userName ? ', ' + data.userName : ''},</p>

    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:32px;margin:0">⚠️</p>
      <p style="color:#ef4444;font-size:18px;font-weight:700;margin:8px 0 4px">Platba po splatnosti: ${data.price.toLocaleString('cs-CZ')} Kč</p>
      <p style="color:#999;font-size:13px;margin:0">Zaznamenali jsme nezaplacenou fakturu za revizi #${data.readableId}.</p>
    </div>

    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px">
      Prosíme o úhradu dlužné částky co nejdříve, abyste se vyhnuli případným sankcím nebo pozastavení služeb.
    </p>

    <div style="text-align:center;margin:24px 0">
      ${button('Zaplatit revizi online ihned', data.paymentUrl, '#ef4444', '#fff')}
    </div>
  `);

  return {
    subject: `⚠️ Platba po splatnosti za revizi #${data.readableId}`,
    html,
  };
}

export function orderPaymentLinkEmail(data: {
  userName: string | null;
  readableId: string;
  serviceType: string;
  price: number;
  paymentUrl: string;
}) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Platba za revizi</h2>
    <p style="color:#999;font-size:14px;margin:0 0 24px">Dobrý den${data.userName ? ', ' + data.userName : ''},</p>

    <div style="background:rgba(250,204,21,0.05);border:1px solid rgba(250,204,21,0.15);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="color:#facc15;font-size:18px;font-weight:700;margin:0 0 4px">K úhradě: ${data.price.toLocaleString('cs-CZ')} Kč</p>
      <p style="color:#999;font-size:13px;margin:0">Technik vystavil konečnou cenu za vaši revizi #${data.readableId}.</p>
    </div>

    <div style="text-align:center;margin:24px 0">
      ${button('Zaplatit revizi online', data.paymentUrl, '#22c55e', '#fff')}
    </div>
  `);

  return {
    subject: `💳 Platba za revizi #${data.readableId} – ${data.price.toLocaleString('cs-CZ')} Kč`,
    html,
  };
}