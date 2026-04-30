import { prisma } from '@/lib/prisma';
import { SUBSCRIPTION_PLANS, SubscriptionPlanKey } from './subscription-pricing';

const CACHE_SEC = 0; // if we want to add cache later

export type SubscriptionPriceConfig = {
  label: string;
  yearlyPriceCzk: number;
};

export type ServicePriceConfig = {
  id: string;
  label: string;
  desc: string;
  price: string;
  priceValue: number;
  group: string;
};

export async function getSubscriptionPrices(): Promise<Record<SubscriptionPlanKey, SubscriptionPriceConfig>> {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'pricing_subscriptions' } });
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value);
      if (parsed.CUSTOMER) {
        return parsed as Record<SubscriptionPlanKey, SubscriptionPriceConfig>;
      }
    } catch (e) {
      console.error('Error parsing pricing_subscriptions', e);
    }
  }
  return SUBSCRIPTION_PLANS; // fallback
}

const DEFAULT_SERVICES: ServicePriceConfig[] = [
  { id: 'elektro_byt', label: 'Elektroinstalace – Byt', desc: 'Revize elektroinstalace v bytové jednotce', price: 'od 2 500 Kč', priceValue: 2500, group: 'Elektro' },
  { id: 'elektro_dum', label: 'Elektroinstalace – Dům', desc: 'Kompletní revize elektro v rodinném domě', price: 'od 3 500 Kč', priceValue: 3500, group: 'Elektro' },
  { id: 'elektro_spolecne', label: 'Elektro – Společné prostory', desc: 'Revize společných prostor bytového domu', price: 'od 4 000 Kč', priceValue: 4000, group: 'Elektro' },
  { id: 'plyn', label: 'Plynové zařízení', desc: 'Kontrola plynových spotřebičů a rozvodů', price: 'od 1 800 Kč', priceValue: 1800, group: 'Plyn' },
  { id: 'hromosvod', label: 'Hromosvod', desc: 'Revize systému ochrany před bleskem', price: 'od 3 000 Kč', priceValue: 3000, group: 'Elektro' },
  { id: 'kominy', label: 'Komíny a spalinové cesty', desc: 'Kontrola a čištění komínů', price: 'od 1 200 Kč', priceValue: 1200, group: 'Požární' },
  { id: 'hasici_pristroje', label: 'Hasicí přístroje', desc: 'Kontrola a revize hasicích přístrojů', price: 'od 500 Kč/ks', priceValue: 500, group: 'Požární' },
  { id: 'pozarni', label: 'Požární bezpečnost', desc: 'Požární revize objektu (PBŘ, únikové cesty)', price: 'od 3 500 Kč', priceValue: 3500, group: 'Požární' },
  { id: 'vytahy', label: 'Výtahy', desc: 'Odborná zkouška a provozní prohlídka výtahů', price: 'od 5 000 Kč', priceValue: 5000, group: 'Technická' },
  { id: 'tlakove', label: 'Tlaková zařízení', desc: 'Revize tlakových nádob a zařízení', price: 'od 2 500 Kč', priceValue: 2500, group: 'Technická' },
  { id: 'komplexni', label: 'Komplexní revize objektu', desc: 'Kompletní revizní audit celé nemovitosti', price: 'Individuální', priceValue: 5000, group: 'Komplex' },
  { id: 'vlastni_revize', label: 'Nahrát vlastní revizi', desc: 'Máte hotovou revizi? Nahrajte ji pro správu termínů', price: 'Zdarma', priceValue: 0, group: 'Ostatní' },
];

export async function getServicePrices(): Promise<ServicePriceConfig[]> {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'pricing_services' } });
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ServicePriceConfig[];
      }
    } catch (e) {
      console.error('Error parsing pricing_services', e);
    }
  }
  return DEFAULT_SERVICES;
}

export async function getUrgentSurcharge(): Promise<number> {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'pricing_urgent_surcharge' } });
  if (config?.value) {
    const val = parseInt(config.value, 10);
    if (!isNaN(val)) return val;
  }
  return 2000;
}

export async function getPricingDatabase() {
  const [subscriptions, services, urgentSurcharge] = await Promise.all([
    getSubscriptionPrices(),
    getServicePrices(),
    getUrgentSurcharge()
  ]);
  return { subscriptions, services, urgentSurcharge };
}
