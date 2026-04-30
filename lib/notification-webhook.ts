/**
 * Volitelné přeposlání in-app upozornění na externí URL (např. backend Android aplikace → FCM).
 *
 * Nastavení:
 * - NOTIFICATION_WEBHOOK_URL – pokud je prázdné, nic se nevolá
 * - NOTIFICATION_WEBHOOK_SECRET – volitelný Bearer token (Authorization: Bearer …)
 * - NOTIFICATION_DEEPLINK_PREFIX – volitelně např. `revizone://` nebo `https://app.vasedomena.cz`
 *   → pole `deepLink` v payloadu (otevření správné obrazovky v aplikaci)
 */

export type NotificationWebhookPayload = {
  event: 'notification.created';
  notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    /** Absolutní https URL do webové Revizone (NEXTAUTH_URL / APP_URL + link) – vhodné pro Android App Links */
    linkAbsolute: string | null;
    /**
     * Volitelné URI pro vlastní schéma nebo jinou doménu aplikace (viz NOTIFICATION_DEEPLINK_PREFIX).
     * Pokud prefix není nastaven, je null (použijte linkAbsolute + Intent s daty z link).
     */
    deepLink: string | null;
    createdAt: string;
  };
};

function getAppBaseUrl(): string {
  const u = process.env.NEXTAUTH_URL || process.env.APP_URL;
  if (!u) return '';
  return u.replace(/\/$/, '');
}

function toAbsoluteLink(relativeOrEmpty: string | null | undefined): string | null {
  if (!relativeOrEmpty) return null;
  if (/^https?:\/\//i.test(relativeOrEmpty)) return relativeOrEmpty;
  const base = getAppBaseUrl();
  if (!base) return null;
  const path = relativeOrEmpty.startsWith('/') ? relativeOrEmpty : `/${relativeOrEmpty}`;
  return `${base}${path}`;
}

/**
 * NOTIFICATION_DEEPLINK_PREFIX např. `revizone://` nebo `https://app.vasedomena.cz`
 * → spojí s cestou z link (bez úvodního /).
 */
function toDeepLink(relativeOrEmpty: string | null | undefined): string | null {
  const prefix = process.env.NOTIFICATION_DEEPLINK_PREFIX?.trim();
  if (!prefix || !relativeOrEmpty) return null;
  const path = relativeOrEmpty.replace(/^\//, '');
  if (prefix.endsWith('://')) {
    return `${prefix}${path}`;
  }
  const base = prefix.replace(/\/$/, '');
  return `${base}/${path}`;
}

export function dispatchNotificationWebhook(record: {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: Date | string;
}): void {
  const url = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  if (!url) return;

  const createdAt =
    typeof record.createdAt === 'string' ? record.createdAt : record.createdAt.toISOString();
  const linkAbs = toAbsoluteLink(record.link);
  const deep = toDeepLink(record.link);

  const body: NotificationWebhookPayload = {
    event: 'notification.created',
    notification: {
      id: record.id,
      userId: record.userId,
      type: record.type,
      title: record.title,
      message: record.message,
      link: record.link,
      linkAbsolute: linkAbs,
      deepLink: deep,
      createdAt,
    },
  };

  void (async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Revizone-Notification-Webhook/1.0',
      };
      const secret = process.env.NOTIFICATION_WEBHOOK_SECRET?.trim();
      if (secret) {
        headers.Authorization = `Bearer ${secret}`;
      }

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(t);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[notification-webhook] HTTP ${res.status}`, text.slice(0, 500));
      }
    } catch (e) {
      console.error('[notification-webhook] Failed:', e);
    }
  })();
}
