# Nasazení pricing changes na produkci

Tento dokument popisuje **konkrétní kroky**, které je třeba provést na produkčním
serveru a ve Stripe dashboardu, aby všechny změny z `docs/pricing-rules.md`
fungovaly. Postupujte shora dolů.

---

## 1. Aktualizace databáze (Prisma migrace)

Migrace `prisma/migrations/20260518000000_add_user_object_limits/migration.sql` přidává:

- 7 sloupců do tabulky `User` (object limits, company tech billing, referral)
- 1 cizí klíč + index pro `User.referredByRealtorId`
- Novou tabulku `ReferralReward` s indexy a cizími klíči

### Spuštění (produkce s migrate flow)

```bash
# 1. Aplikujte migraci
npx prisma migrate deploy

# 2. Regenerujte Prisma client (postinstall toto dělá automaticky při npm install)
npx prisma generate
```

### Spuštění (dev / staging bez migrate)

```bash
npx prisma db push   # pushne schéma rovnou, bez migrace
```

### Ověření

```sql
-- V MySQL klientu:
SHOW COLUMNS FROM `User` LIKE 'object%';     -- 4 řádky
SHOW COLUMNS FROM `User` LIKE 'companyTech%'; -- 2 řádky
SHOW COLUMNS FROM `User` LIKE 'referredBy%'; -- 1 řádek
SHOW TABLES LIKE 'ReferralReward';            -- 1 řádek
```

---

## 2. Stripe – nové ceny (Price ID)

V Stripe Dashboardu (Test mode nebo Live):

### 2.1 Aktualizace existujících předplatných

Nejprve aktualizujte ceny stávajících profilů na nové hodnoty
(viz `docs/pricing-rules.md` sekce 5):

| Plán | Stará cena | Nová cena | Akce |
|---|---|---|---|
| SVJ | 799 Kč / rok | **1 199 Kč / rok** | vytvořte novou Price v existujícím produktu, aktualizujte `SUBSCRIPTION_PLANS.SVJ.stripePriceId` |
| Firma | 1 199 Kč / rok | **4 999 Kč / rok** | totéž |
| Realtor | 699 Kč / rok | **bez ročního poplatku** | smažte / archivujte produkt; v kódu už je nastaveno `yearlyPriceCzk: 0` |

> **Pozn.**: existujícím subscribers se cena nezmění automaticky. Stripe doporučuje
> dokument *Update a subscription's price* – buďto manuálně u každého, nebo
> migrace přes API.

### 2.2 Nové produkty pro doplňky

V dashboardu **Products → Add product** vytvořte tři nové produkty:

#### A) „Další objekt (zákazník)“
- Pricing: **Recurring**, **Yearly**
- Amount: **100,00 CZK**
- Currency: CZK
- *Po vytvoření zkopírujte Price ID a uložte do .env:*
  ```
  STRIPE_PRICE_CUSTOMER_EXTRA_OBJECT=price_XXXXXXXXXXXXX
  ```

#### B) „Balíček do 10 objektů (SVJ / firma)“
- Pricing: **Recurring**, **Yearly**
- Amount: **600,00 CZK**
- Currency: CZK
- *Po vytvoření:*
  ```
  STRIPE_PRICE_PACKAGE_10_OBJECTS=price_XXXXXXXXXXXXX
  ```

#### C) „Billing techniků (firma)“
- Pricing: **Recurring**, **Monthly**
- Amount: **200,00 CZK**
- Currency: CZK
- *Po vytvoření:*
  ```
  STRIPE_PRICE_COMPANY_TECH_SEAT=price_XXXXXXXXXXXXX
  ```

### 2.3 Webhook events

V Stripe Dashboardu → **Developers → Webhooks** → edit váš webhook endpoint:

Musíte mít vybrané **všechny tyto eventy**:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

První dva už nejspíš máte (původní platby). Druhé dva přibyly s novým flow
pro doplňky – bez nich Stripe nezruší addony, když uživatel zruší předplatné.

### 2.4 Verifikace

Po nastavení proměnných restartujte Next.js:

```bash
# Vývoj
npm run dev

# Produkce
npm run build && npm run start
```

V administraci na `/admin/pricing` ve spodním panelu *„Limity objektů a rozšíření“*
musí u obou karet svítit zeleně **nakonfigurováno**.

---

## 3. Env proměnné – kompletní výpis

V `.env` (nebo Coolify / Vercel / Railway → Environment) musí být:

```bash
# Stripe (povinné pro platby)
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_LICENSE_PERIOD_MONTHS=12

# Stripe Price IDs pro doplňky (povinné pro nové funkce)
STRIPE_PRICE_CUSTOMER_EXTRA_OBJECT=price_…
STRIPE_PRICE_PACKAGE_10_OBJECTS=price_…
STRIPE_PRICE_COMPANY_TECH_SEAT=price_…

# DB + Auth (existující)
DATABASE_URL=mysql://…
NEXTAUTH_SECRET=…
NEXTAUTH_URL=https://vase-domena.cz
```

Volitelné pro vývoj místo Stripe (fake brána):

```bash
FAKE_PAYMENT_GATEWAY=1
```

---

## 4. Otestování po nasazení

| # | Test | Očekávaný výsledek |
|---|---|---|
| 1 | Registrace nového CUSTOMER | `User.objectLimitBase = 0`, fallback z role = 1 |
| 2 | CUSTOMER zkusí přidat 2. objekt přes `/dashboard` | HTTP 402, výzva k zaplacení 100 Kč |
| 3 | CUSTOMER aktivuje addon (Stripe checkout) | Po `checkout.session.completed` má `objectLimitExtraPaid = 1` |
| 4 | CUSTOMER klikne „Zvýšit o 1“ | Stripe sub quantity přejde z 1 → 2 |
| 5 | CUSTOMER klikne „Snížit o 1“ | Quantity zpět na 1 |
| 6 | SVJ s 4 objekty zkusí přidat 5. | HTTP 402, výzva k aktivaci balíčku 600 Kč |
| 7 | SVJ aktivuje balíček | `objectPackagePaid = true`, lze přidávat až do 10 |
| 8 | Firma aktivuje billing techniků | Stripe sub vytvořen s quantity = current billable |
| 9 | Technik se připojí k firmě | Auto-sync zvýší quantity ve Stripe |
| 10 | Firma odpojí technika | Auto-sync sníží quantity |
| 11 | Makléř pošle link `?ref=<inviteCode>` | Customer registrace nastaví `referredByRealtorId` |
| 12 | Customer první úhrada | V `/realty/referrals` se objeví nová odměna 20 Kč ve stavu PENDING |
| 13 | Admin označí odměnu jako PAID | V tabulce se změní status + `paidAt` |

---

## 5. Rollback (pokud něco selže)

```bash
# 1. Revert kódu na předchozí commit
git revert HEAD~1
git push origin main

# 2. Drop tables / columns (POZOR – ztratíte uložená data!)
mysql -u root -p <<EOF
ALTER TABLE `User`
  DROP COLUMN `objectLimitBase`,
  DROP COLUMN `objectLimitExtraPaid`,
  DROP COLUMN `objectPackagePaid`,
  DROP COLUMN `objectLimitOverride`,
  DROP COLUMN `companyTechBillingActive`,
  DROP COLUMN `companyTechSubscriptionId`,
  DROP FOREIGN KEY `User_referredByRealtorId_fkey`,
  DROP INDEX `User_referredByRealtorId_idx`,
  DROP COLUMN `referredByRealtorId`;
DROP TABLE `ReferralReward`;
EOF
```

> Pokud máte zaplacené addony ve Stripe, **NESPOUŠTĚJTE drop columns** – jen
> deaktivujte UI cestou environment proměnných.

---

## 6. Dotazy?

- E-mail: info@revizone.cz
- Diagram pravidel: `docs/pricing-rules.md`
- Veřejná stránka cen: `/cenik`
