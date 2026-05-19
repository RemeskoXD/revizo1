# Pravidla limitů objektů a příplatků (revizone)

> Zdroj pravdy pro pravidla **„kolik objektů má profil v základu, kolik stojí rozšíření a kdy je individuální nabídka“**.
> Vychází z architektonického diagramu profilů (Legenda → Profily → Profit → Dodatek).
> Platnost: **18. 5. 2026**

Pojmem **„objekt“** se rozumí evidovaná nemovitost / budova / bytová jednotka v účtu (model `Property` v Prismě).
Pojem **„roční předplatné“** = základní licenční poplatek za přístup k profilu (viz `lib/subscription-pricing.ts`).
Příplatky za rozšíření jsou **nad rámec** ročního předplatného a fakturují se rovněž ročně.

---

## 1. Zákazník (`CUSTOMER`)

- **Roční předplatné:** 199 Kč / rok (1. měsíc zdarma)
- **Základ:** **1 objekt** (typicky 1 dům / byt)
- **Každý další objekt:** **+100 Kč / rok** za objekt
- **Individuální nabídka:** ne (cena je lineární)

**Příklad:** zákazník se 3 objekty zaplatí `199 + 2 × 100 = 399 Kč / rok`.

**Stripe cena (aktuálně v kódu):** `price_1TRxwALtyGxFBhS8q8DqepQ9`
**Stripe cena pro „další objekt 100 Kč/rok“:** *zatím nezavedeno → TODO*

---

## 2. Správce SVJ / Bytové domy (`SVJ`)

- **Roční předplatné:** 1199 Kč / rok (1. měsíc zdarma)
- **Základ:** **3 objekty**
- **Rozšíření:** do **10 objektů** za **600 Kč / rok** (jednorázový balíček, ne per-objekt)
- **Nad 10 objektů:** **individuální nabídka** (kontakt obchodu)

**Příklad:** SVJ se 7 objekty: `799 + 600 = 1399 Kč / rok` (do 10 zahrnuto).
SVJ s 15 objekty: nutno kontaktovat obchod, individuální cena.

**Stripe cena (aktuálně v kódu):** `price_1TRyNaLtyGxFBhS85AGMIiJl`
**Stripe cena pro „balíček do 10 objektů 600 Kč/rok“:** *zatím nezavedeno → TODO*

---

## 3. Pro firmy (`COMPANY_ADMIN`)

- **Roční předplatné:** 4999 Kč / rok (nebo 499 Kč / měs) – 1. měsíc zdarma
- **Základ:** **3 objekty** (vlastní budovy/pobočky firmy)
- **Rozšíření:** do **10 objektů** za **600 Kč / rok**
- **Nad 10 objektů:** **individuální nabídka**

**Měsíční ekonomika týmu techniků** (viz sekce 4a):
- **200 Kč / měs** za každého technika ve skupině
- **Každý 10. technik zdarma** (slevová formule)
- Implementováno jako Stripe **měsíční** subscription s `quantity = billable seats`

**Stripe cena (aktuálně v kódu):** `price_1TRyN2LtyGxFBhS8Io9Mnq3k`
**Stripe cena pro „balíček do 10 objektů 600 Kč/rok“:** *zatím nezavedeno → TODO*

---

## 4. Ostatní profily (pro kontext)

| Profil | Limit objektů | Poznámka |
|---|---|---|
| **Technik** (`TECHNICIAN`) | n/a | Technik objekty nedrží, dostává objednávky. Účtuje % z dokončených zakázek. |
| **Realitní makléř / Produkt manager** (`REALTY` / `PRODUCT_MANAGER`) | bez limitu (portfolio) | Viz sekce 4b – referral 199 Kč za zákazníka, **20 Kč zpět** makléři za úspěšnou registraci. |
| **Administrátor** | n/a | Bez limitu, neplatí. |

---

## 4a. Firemní billing techniků (`COMPANY_ADMIN`)

- **Cena za technika:** **200 Kč / měsíc**
- **Sleva:** **každý 10. technik zdarma** (techCount − floor(techCount/10))
- **Příklady:**

| Počet techniků | Billable | Měsíčně |
|---|---|---|
| 1 | 1 | 200 Kč |
| 9 | 9 | 1 800 Kč |
| 10 | 9 | 1 800 Kč |
| 15 | 14 | 2 800 Kč |
| 20 | 18 | 3 600 Kč |
| 100 | 90 | 18 000 Kč |

**Implementace:**
- Stripe Price ID: `STRIPE_PRICE_COMPANY_TECH_SEAT` (200 Kč / měsíc, recurring, quantity-based)
- Při přijetí / odpojení technika se automaticky sync provede přes `subscriptions.update` (pokud má firma aktivní billing)
- Helper: `lib/company-pricing.ts` – `computeBillableTechs(n)`, `computeMonthlyCost(n)`

---

## 4b. Referral program (`REALTY` / `PRODUCT_MANAGER`)

- Makléř má **inviteCode** (již existuje na `User`); pro registraci zákazníka se použije URL `?ref=<inviteCode>` nebo `?invite=<inviteCode>` na `/register`.
- Po **první úspěšné platbě** zákazníka (webhook `invoice.paid`) získá makléř **20 Kč** kredit (záznam `ReferralReward` se statusem `PENDING`).
- Admin pak vyplatí makléřovi kredit (status `PAID`); odměny se sčítají v UI `/realty/referrals`.
- **199 Kč** = standardní roční předplatné CUSTOMER, žádný extra poplatek neexistuje – pouze sledování příchodu zákazníka přes makléře.

---

## 5. Souhrnná tabulka

| Profil        | Roční předplatné | Základ objektů | Rozšíření                         | Nad rámec              |
|---------------|------------------|----------------|-----------------------------------|------------------------|
| Zákazník      | 199 Kč / rok     | 1              | každý další **100 Kč / rok**      | –                      |
| SVJ           | 1 199 Kč / rok   | 3              | do 10 objektů za **600 Kč / rok** | individuální nabídka   |
| Pro firmy     | 4 999 Kč / rok   | 3              | do 10 objektů za **600 Kč / rok** | individuální nabídka   |

---

## 6. Co z toho ještě není v kódu (TODO pro implementaci)

Toto je **dokumentace pravidel**. Aplikace momentálně limity nehlídá.
Pro plnou implementaci je potřeba:

1. **Datový model** — přidat na `User` (nebo na samostatný model `Subscription`):
   - `objectLimitBase: Int` (např. 1 / 3 / 3 podle role)
   - `objectLimitExtraPaid: Int` (počet zaplacených dalších objektů u zákazníka)
   - `objectPackagePaid: Boolean` (zaplacený balíček do 10 u SVJ / firmy)
   - `objectLimitOverride: Int?` (pro individuální nabídku nad 10)
2. **API enforcement** — v `app/api/properties/route.ts` (POST) zkontrolovat počet objektů
   uživatele a vrátit `402 Payment Required` / přesměrování na Stripe checkout, pokud
   by se přesáhl povolený limit.
3. **UI** — na dashboardech (`/dashboard`, `/svj`, `/company`) zobrazit progress
   „využíváte X / Y objektů“ a tlačítko **„Přidat další objekt“** /
   **„Aktivovat balíček do 10 objektů“** s odkazem na Stripe.
4. **Stripe** — vytvořit nové cenové položky:
   - `customer_extra_object_yearly` = 100 Kč / rok / objekt (recurring, quantity-based)
   - `svj_pack10_yearly` = 600 Kč / rok (recurring, jednorázový upgrade)
   - `company_pack10_yearly` = 600 Kč / rok
   a doplnit ID do `lib/subscription-pricing.ts`.
5. **Admin** — v `app/admin/pricing/AdminPricingClient.tsx` umožnit změnu těchto
   sazeb a nastavení **individuální ceny** pro konkrétní účet (override nad 10).
6. **Obchodní podmínky** — promítnout do `app/obchodnipodminky/page.tsx`,
   sekce 4 „Objednávky, ceny a platby“ — přidat odstavec o limitech a příplatcích.
7. **Registrace** — v `app/register/page.tsx` doplnit tyto limity přímo
   k popiskům balíčků (zatím doplněno alespoň textově, viz commit s touto změnou).
