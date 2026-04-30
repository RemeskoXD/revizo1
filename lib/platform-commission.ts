/**
 * Obchodní pravidla provize platformy (příprava na Stripe / výpočet poplatků).
 * Hodnoty jsou desetinná čísla 0–1 (např. 0.1 = 10 %).
 *
 * 1) Zakázka vzniklá tak, že zákazník ji vyžádal přímo v aplikaci Revizone → provize platformy 10 %.
 * 2) Nový uživatel přivedený do systému někým jiným než zákazníkem a zakázka dokončena → provize 5 %.
 *
 * Konkrétní účtování přes Stripe (Connect, split payments) doplníte propojením webhooků a polí u objednávky.
 */
export const PLATFORM_FEE_RATE_CUSTOMER_APP_ORDER = 0.1;
export const PLATFORM_FEE_RATE_REFERRAL_NON_CUSTOMER = 0.05;

export function describePlatformFeeRules(): string {
  return (
    `Provize platformy: ${PLATFORM_FEE_RATE_CUSTOMER_APP_ORDER * 100} % z hodnoty zakázky, pokud objednávku vytvoil zákazník v aplikaci; ` +
    `${PLATFORM_FEE_RATE_REFERRAL_NON_CUSTOMER * 100} %, pokud zakázka souvisí s uživatelem přivedeným do systému osobou jinou než zákazníkem (po dokončení zakázky).`
  );
}
