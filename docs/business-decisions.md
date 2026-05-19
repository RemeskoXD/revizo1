# Otevřená rozhodnutí a roadmapa změn

Tento dokument zachycuje **rozhodnutá pravidla, otevřené body a plán nasazení**,
které vyplynuly z diskuse o úpravách uživatelských profilů, plateb a logiky aplikace
(19. 5. 2026).

> Některé body vyžadují ještě business potvrzení – sledujte ⏳ a ❓.

---

## 1. Uživatelské profily – aktuální stav po rebrandingu

| Interní role | Veřejný název | Popis |
|---|---|---|
| `CUSTOMER` | Zákazník | Majitelé rodinných domů / bytů (FO i PO) |
| `TECHNICIAN` | **Revizní technik** ✅ | Certifikovaný revizní technik |
| `COMPANY_ADMIN` | **Pracujeme v týmu** ✅ | Manažer revizních techniků (FO i PO), deleguje práci |
| `SVJ` | Správce SVJ / Bytové domy | Multi-budovy, sdílený přístup *(plánováno)* |
| `REALTY` / `PRODUCT_MANAGER` | Produkt Manager (Realitní makléř) | Portfolio nemovitostí |
| `ADMIN` / `SUPPORT` / `CONTRACTOR` | Admin | Helpdesk, schvalování, reset hesel |

✅ = už nasazeno v UI; ostatní role mají svůj label nezměněn.

### 1.1 „Velké firmy“ – B2 ✅
**Rozhodnuto:** Velké firmy = **stejné jako SVJ** (multi-budovy, sdílený přístup),
jen jiný marketingový popis. **Nepřidává se nová role**. V budoucnu lze
přidat „display alias“ na registrační stránku, pokud bude potřeba.

### 1.2 Filtrované typy revizí podle role ❓
**Cíl:** Zákazník vidí jen revize relevantní pro rodinný dům; SVJ jen pro bytový
dům; firma jen pro vlastní pobočky. Implementace:
- Rozšířit `RevisionCategory` o pole `targetRoles: string[]` (např. `["CUSTOMER", "SVJ"]`).
- V `/dashboard/new-order`, `/svj/new-order`, `/company/new-order` filtrovat.
- Default: pokud `targetRoles` prázdné, kategorie se zobrazí všem.

⏳ Naplánováno na další iteraci.

---

## 2. Platební logika

### 2.1 Manažer „Pracujeme v týmu“ – B1 ⏳
**Rozhodnuto:** ZATÍM NEMĚNIT (4 999 Kč / rok zůstává). Vrátíme se k tomu po
detailnější diskusi o ekonomickém modelu. Plán pro příští kolo:

- Smazat roční paušál (yearly = 0)
- Manažer dostává procenta z dokončených zakázek přes `commissionRate` (jako technik)
- Per-tech billing 200 Kč / měs zůstává (lze upravit v `lib/company-pricing.ts`,
  konstanta `TECH_SEAT_MONTHLY_CZK` – přesné číslo v intervalu **200–600 Kč** se doladí)

### 2.2 Trigger platby u zákazníka – B4 ⏳
**Rozhodnuto:** Zachovat 1 měsíc zdarma; checkout vyvolat při první revizi
(místo fixního data konce trialu).

Implementační poznámky:
- Pole `User.requiresSubscriptionCheckout` se aktuálně nastavuje při expiraci trialu.
- Nový flow: nezatahovat trial konec na boot dashboardu, místo toho v
  `POST /api/orders` (a v `/dashboard/new-order` formuláři) zkontrolovat
  `licenseValidUntil` a pokud expirovaná → vrátit 402 + přesměrovat na checkout.

⏳ Naplánováno na další iteraci (musí se zladit s 2.3 lock-out).

### 2.3 Lock-out neplatících účtů ⏳
**Cíl:** Po expiraci licence účet NEMAZAT, ale:
- ⛔ blokovat tvorbu nových objednávek / revizí (`POST /api/orders`, `POST /api/properties`)
- 🔒 PDF / fotodokumentaci nelze stáhnout, jen rozmazaný náhled
- 🔔 banner / notifikace „Uhraďte předplatné pro znovuotevření“

Implementace:
- Helper `lib/access-control.ts` – `hasActiveLicense(user)` a `assertActiveLicense()`
- Middleware na `/api/orders` POST, `/api/properties` POST, `/api/orders/[id]/download`
- Komponenta `BlurredFilePreview` pro UI
- Banner v `<DashboardLayout>` pro vypršenou licenci

⏳ Naplánováno na další iteraci jako balíček „Access Control“.

### 2.4 Realitní makléř – nový model 200/-20 – B3 ⏳
**Rozhodnuto:** **Oba modely paralelně:**
- Existující referral 20 Kč zpět pro `?ref=` registraci → **zachovat**
- Nový: 200 Kč při převodu nemovitosti přes invite kód, 20 Kč zpět při aktivním
  novém uživateli → **přidat**

Implementace:
- Nová Stripe Price `STRIPE_PRICE_REALTY_TRANSFER_FEE` (200 Kč jednorázová, ne recurring)
- `/api/properties/[id]/confirm-transfer` po úspěšném převodu vystavit fakturu
  makléři přes Stripe
- Po 30 dnech aktivity nového uživatele vytvoří `ReferralReward { amountCzk: 20, status: PENDING, source: 'PROPERTY_TRANSFER' }`
- Rozšířit existující `ReferralReward` model o `source` field (`?REF_LINK` | `PROPERTY_TRANSFER` | `MANUAL`)

⏳ Naplánováno na další iteraci.

---

## 3. Nové funkce

### 3.1 Hlídání platnosti dokumentů (firmy) ⏳
**Cíl:** Velké firmy mohou evidovat svářečské průkazy, zdravotní prohlídky atd.
- Nový model `CompanyDocument { id, ownerId, title, fileBase64, validUntil, category, …}`
- UI: nová sekce `/company/documents` (nebo `/company/dokumenty`)
- Manuální zadání data platnosti **vždy možné** (záloha)
- 🤖 **AI extrakce data platnosti** z PDF – TODO, závisí na výběru providera
  (OpenAI / lokální OCR). Manuální vstup je primární cesta, AI je doplněk.

⏳ Naplánováno na další iteraci. Pro AI extrakci je třeba určit poskytovatele.

### 3.2 Skrytá prázdná Historie ✅
**Hotovo:**
- `/dashboard`: „Nedávné objednávky“ se nezobrazí, když `recentOrders.length === 0`
- `/company`: „Poslední zakázky“ se nezobrazí, když `recentOrders.length === 0`
- `/svj`: „Upcoming revisions“ už mělo conditional rendering
- `/technician/job/[id]`: „Historie na této adrese“ už mělo conditional rendering

Nový uživatel uvidí jen empty-state „Začněte s Revizone“ s tlačítkem
„Objednat první revizi“.

### 3.3 Multi-login pro SVJ a Velké firmy ⏳
**Cíl:** Více přihlášení sdílí jeden účet/profil. Nepokrývá REALTY (nižší priorita).

Architektonický nástřel:
- Nový model `Account` (sdílený kontejner: budovy, revize, billing)
- `User.accountId` (FK na Account)
- Account může mít víc Userů s vlastními credentials a rolemi (`OWNER` | `MEMBER`)
- Auth flow: po loginu User → resolveActiveAccount → context.accountId

⏳ Velký refactor, plánováno na vlastní iteraci (po doladění 2.x).

---

## 4. Organizační (mimo kód)

- 📨 **Odkazy do týmu:** Po nasazení poslat zaměstnancům staging URL (`app1.com`)
  a APK build (NE `apk.cz`, aby se to nedostalo na ostrou doménu).
  Připravit `docs/staging-deployment.md`.
- 📅 **Pravidelný sync:** Každé pondělí v 15:30.
- 🌳 **Architektonické nákresy:** Pro plánování dalších iterací používat
  stromové struktury / Mermaid diagramy v `docs/`.

---

## 5. Stav implementace

| Téma | Status | Soubory |
|---|---|---|
| A1) Přejmenování „Technik“ → „Revizní technik“ | ✅ Hotovo | `lib/constants.ts`, `lib/role-labels.ts`, `lib/subscription-pricing.ts`, register stránky, admin UI, dashboardy, e-maily |
| A2) Přejmenování „Firma“ → „Pracujeme v týmu“ | ✅ Hotovo | Tytéž soubory jako A1 |
| A3) Skrýt prázdnou Historii | ✅ Hotovo | `DashboardClient.tsx`, `CompanyDashboardClient.tsx` |
| B1) Manažer ekonomika | ⏳ Odloženo | – |
| B2) „Velké firmy“ = SVJ | ✅ Rozhodnuto (žádný kód) | – |
| B3) Makléř 200/-20 model | ⏳ Odloženo | – |
| B4) CUSTOMER trigger na první revizi | ⏳ Odloženo | – |
| Filtrované revizní typy | ⏳ Odloženo | – |
| Lock-out neplatících | ⏳ Odloženo | – |
| Hlídání dokumentů (firmy) | ⏳ Odloženo | – |
| Multi-login SVJ + Velké firmy | ⏳ Odloženo | – |
| AI extrakce data platnosti | ⏳ Odloženo (závisí na providerovi) | – |

---

## 6. Doporučené pořadí dalších kroků

1. **Lock-out + first-revision trigger** (souvisí, nasaďte spolu): 2.2 + 2.3
2. **Filtrované revizní typy podle role:** 1.2
3. **Hlídání dokumentů firem (bez AI):** 3.1 (jen manuální vstup)
4. **Manažer ekonomika:** B1 (vyžaduje business diskusi o procentech / měsíčních částkách 200–600 Kč)
5. **Makléř 200/-20 model:** B3
6. **Multi-login SVJ + Velké firmy:** 3.3 (velký refactor)
7. **AI extrakce z PDF:** 3.1 doplněk (po výběru providera)
