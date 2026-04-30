import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Obchodní podmínky a ochrana osobních údajů | Revizone',
  description:
    'Obchodní podmínky, zásady ochrany osobních údajů (GDPR) a informace pro uživatele mobilní aplikace Revizone v souladu s požadavky Google Play.',
  robots: { index: true, follow: true },
};

const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="mb-4 text-lg font-bold text-white sm:text-xl">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-gray-300 sm:text-base">{children}</div>
  </section>
);

export default function ObchodniPodminkyPage() {
  return (
    <div className="min-h-dvh bg-[#111111] text-gray-200">
      <div className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/login"
            className="flex shrink-0 items-center gap-2 rounded-lg p-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Zpět</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-brand-yellow" />
            <h1 className="truncate text-base font-bold text-white sm:text-lg">
              Obchodní podmínky &amp; ochrana údajů
            </h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-16 sm:px-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-brand-yellow/90">Platné od 16. 4. 2026</p>
        <p className="mb-6 text-xs text-gray-500">
          Doplnění k předplatnému přístupu ke Službě (zprostředkování plateb Stripe): 18. 4. 2026.
        </p>
        <p className="mb-10 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
          Tento dokument slouží jako přehled pravidel používání služby <strong className="text-gray-300">Revizone</strong>{' '}
          (webová aplikace a související mobilní klient / PWA) a jako informace o zpracování osobních údajů ve smyslu nařízení
          Evropského parlamentu a Rady (EU) 2016/679 (GDPR). Text nenahrazuje individuální právní poradenství.
        </p>

        <div className="mb-10 rounded-xl border border-brand-yellow/20 bg-brand-yellow/5 p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
            <Shield className="h-5 w-5 text-brand-yellow" />
            Identifikace vydavatele a poskytovatele služeb
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-300">
            <li>
              <strong className="text-white">Vydavatel aplikace</strong> (název / vývojář uvedený v záznamu aplikace Revizone v
              obchodě Google Play): <strong className="text-white">Ludvík Remešek</strong>
            </li>
            <li>
              <strong className="text-white">Poskytovatel služeb</strong> (provozní část Služby):{' '}
              <strong className="text-white">ASPERSUN, s.r.o.</strong>
            </li>
            <li>
              <strong className="text-white">Kontaktní e-mail:</strong>{' '}
              <a href="mailto:info@revizone.cz" className="text-brand-yellow hover:underline">
                info@revizone.cz
              </a>
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Pro účely GDPR může být vůči uživatelům v postavení <strong>správce osobních údajů</strong> zejména poskytovatel
            služeb, případně vydavatel — podle toho, kdo určuje účely a prostředky zpracování u konkrétního zpracování. V
            některých vztazích může být role vymezena jinak — viz níže.
          </p>
        </div>

        <div className="mb-10 rounded-xl border border-white/15 bg-white/[0.04] p-4 sm:p-6">
          <h2 className="mb-3 text-base font-semibold text-white sm:text-lg">
            Zásady ochrany soukromí (Privacy Policy) – přehled pro uživatele a obchod Google Play
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            Níže je stručný popis v souladu s běžnými požadavky na zveřejnění ochrany soukromí u aplikací. Podrobnější právní
            rámec je v části o GDPR níže.
          </p>

          <h3 className="mb-2 text-sm font-semibold text-brand-yellow">Kdo jsme a kontakt</h3>
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-gray-300">
            <li>
              <strong className="text-white">Vydavatel / vývojář</strong> (jméno v záznamu v Google Play):{' '}
              <strong className="text-white">Ludvík Remešek</strong>.
            </li>
            <li>
              <strong className="text-white">Provoz služby</strong>: <strong className="text-white">ASPERSUN, s.r.o.</strong>
            </li>
            <li>
              <strong className="text-white">Kontakt</strong> (dotazy k osobním údajům):{' '}
              <a href="mailto:info@revizone.cz" className="text-brand-yellow hover:underline">
                info@revizone.cz
              </a>
              .
            </li>
          </ul>

          <h3 className="mb-2 text-sm font-semibold text-brand-yellow">Typ aplikace</h3>
          <p className="mb-4 text-sm text-gray-300">
            <strong className="text-white">Revizone</strong> je klientské rozhraní (webová aplikace / PWA, případně balíček v
            Google Play) pro přístup k <strong className="text-white">webové službě</strong> určené ke správě objednávek
            revizí, komunikaci mezi objednateli a techniky či firmami, evidenci souvisejících údajů o zakázkách a souvisejícím
            obsahu (zprávy, dokumenty, fotodokumentace u zakázek). Služba sama o sobě není náhradou za odborné provedení
            revize; propojuje účastníky a technicky zprostředkovává proces.
          </p>

          <h3 className="mb-2 text-sm font-semibold text-brand-yellow">Jaká data sbíráme a zpracováváme</h3>
          <ul className="mb-4 list-inside list-disc space-y-2 text-sm text-gray-300">
            <li>
              <strong className="text-white">Účet a přihlášení:</strong> při registraci a přihlášení zpracováváme zejména{' '}
              <strong className="text-white">e-mail</strong> a <strong className="text-white">heslo</strong> (heslo ukládáme
              pouze v <strong className="text-white">hashované podobě</strong>), dále údaje profilu, které vyplníte (např.{' '}
              <strong className="text-white">jméno, telefon</strong>), typ účtu (role) a údaje související s vaší rolí (např.
              vazba na firmu, kód pozvánky u firemních účtů), stav účtu a nastavení (např. e-mailová upozornění).
            </li>
            <li>
              <strong className="text-white">Objednávky a provoz zakázek:</strong> údaje o{' '}
              <strong className="text-white">objednávkách revizí</strong> (např. adresa a popis místa, typ služby a nemovitosti,
              poznámky, stav zakázky), <strong className="text-white">komunikace v rámci zakázky</strong> (zprávy),{' '}
              <strong className="text-white">nahrané soubory</strong> (např. PDF revizní zprávy u zakázek) a{' '}
              <strong className="text-white">fotodokumentace</strong> k zakázce nahraná oprávněným uživatelem (obrázky
              ukládáme v systému vázané na danou objednávku).
            </li>
            <li>
              <strong className="text-white">Nemovitosti a převody</strong> (pokud funkci používáte): údaje o evidovaných
              nemovitostech a případných převodech dle nastavení účtu.
            </li>
            <li>
              <strong className="text-white">Technické údaje a zabezpečení:</strong> při komunikaci s naším serverem mohou být
              zpracovány mimo jiné <strong className="text-white">IP adresa</strong> (např. pro omezení zneužití / rate
              limiting), záznamy v <strong className="text-white">provozních a chybových logách</strong> serveru a údaje
              typické pro web (např. typ prohlížeče v hlavičkách HTTP). Webová aplikace používá{' '}
              <strong className="text-white">cookies / úložiště relace</strong> pro udržení přihlášení (session) prostřednictvím
              NextAuth — viz sekce o cookies níže.
            </li>
          </ul>

          <h3 className="mb-2 text-sm font-semibold text-brand-yellow">Fotoaparát a galerie</h3>
          <p className="mb-4 text-sm text-gray-300">
            Funkce <strong className="text-white">nahrání fotografií k zakázce</strong> (fotodokumentace) používá standardní
            výběr souboru v prohlížeči nebo systémové rozhraní v mobilní aplikaci / PWA: můžete{' '}
            <strong className="text-white">vybrat obrázek z galerie</strong> nebo{' '}
            <strong className="text-white">pořídit snímek fotoaparátem</strong>, podle toho, jak to nabídne vaše zařízení a
            operační systém. Revizone neukládá fotografie mimo účel nahrání do příslušné zakázky v rámci Služby.
          </p>

          <h3 className="mb-2 text-sm font-semibold text-brand-yellow">Účel zpracování</h3>
          <p className="mb-4 text-sm text-gray-300">
            Hlavní účely jsou: <strong className="text-white">poskytování Služby</strong> (vedení účtu, objednávky, přiřazení
            technikům, zobrazení stavu), <strong className="text-white">komunikace</strong> mezi uživateli ohledně zakázek,{' '}
            <strong className="text-white">evidence a dokumentace</strong> související s revizemi v rozsahu funkcí aplikace,{' '}
            <strong className="text-white">zabezpečení, provoz a podpora</strong> (včetně prevence zneužití). Podrobné právní
            základy jsou v oddílu o GDPR.
          </p>

          <h3 className="mb-2 text-sm font-semibold text-brand-yellow">Třetí strany a analytika</h3>
          <p className="text-sm text-gray-300">
            V <strong className="text-white">aktuálně nasazené verzi</strong> webové aplikace Revizone{' '}
            <strong className="text-white">neprovádíme měření návštěvnosti přes Google Analytics</strong> ani{' '}
            <strong className="text-white">nesdílíme data s Firebase</strong> (např. Analytics / Crashlytics) — tyto nástroje
            v kódu Služby nejsou integrovány.{' '}
            <strong className="text-white">Platby předplatného</strong> za přístup ke Službě, pokud jsou nabízeny, probíhají přes
            poskytovatele <strong className="text-white">Stripe</strong>; platební údaje zadáváte v rozhraní Stripe a jejich
            zpracování se řídí dokumentací Stripe (viz též oddíl 4 a GDPR níže). Infrastrukturu (hosting, databáze, e-mail)
            zajišťují vybraní poskytovatelé v roli zpracovatelů; jejich přehled lze vyžádat na kontaktním e-mailu. Pokud by se v
            budoucnu analytika nebo nástroje třetích
            stran doplnily, tento text a údaje v konzoli vývojáře Google Play budou aktualizovány.
          </p>
        </div>

        <div className="space-y-12">
          <Section id="uvod" title="1. Úvod a rozsah">
            <p>
              Tyto obchodní podmínky („<strong>Podmínky</strong>“) upravují používání digitální platformy Revizone, která
              umožňuje zejména správu objednávek revizí, komunikaci mezi účastníky a související služby (dále jen{' '}
              <strong>„Služba“</strong>).
            </p>
            <p>
              Službu můžete využívat prostřednictvím webového rozhraní a/nebo jako <strong>mobilní aplikaci</strong> (včetně
              instalace přes prohlížeč / PWA nebo distribuce přes Google Play, pokud je k dispozici). Používáním Služby
              vyjadřujete souhlas s těmito Podmínkami a se zásadami ochrany osobních údajů uvedenými v téže dokumentaci.
            </p>
            <p>
              Pokud s Podmínkami nesouhlasíte, Službu nevyužívejte. U některých funkcí může být vyžadován samostatný souhlas
              (např. marketing, analytika) — vždy výslovně v rozhraní Služby.
            </p>
          </Section>

          <Section id="sluzby" title="2. Popis Služby a role uživatelů">
            <p>
              Služba propojuje zejména <strong>objednatele revizí</strong> (např. majitele nemovitostí, SVJ, realitní
              subjekty) a <strong>poskytovatele</strong> (revizní techniky, firmy). Konkrétní rozsah funkcí závisí na typu
              účtu (zákazník, technik, firma, administrátor apod.).
            </p>
            <p>
              Revizone <strong>není</strong> samostatným poskytovatelem odborné revizní činnosti, pokud není výslovně uvedeno
              jinak. Smluvní vztah ohledně provedení revize vzniká primárně mezi objednatelem a zvoleným technikem / firmou
              podle jejich vzájemné dohody a platné legislativy.
            </p>
          </Section>

          <Section id="ucet" title="3. Registrace, účet a bezpečnost">
            <p>
              K využití části Služby je nutná registrace. Uživatel je povinen uvádět pravdivé údaje a chránit přístupové
              údaje. Za aktivitu pod svým účtem odpovídá uživatel, pokud neprokáže opak.
            </p>
            <p>
              Účet může být po porušení Podmínky, zákona nebo oprávněného zájmu provozovatele <strong>omezen nebo
              ukončen</strong>. Uživatel může o zrušení účtu požádat prostřednictvím kontaktu uvedeného výše, funkce v
              nastavení účtu (Nastavení → Osobní údaje → smazání účtu) nebo na stránce{' '}
              <Link href="/smazatucet" className="text-brand-yellow hover:underline">
                /smazatucet
              </Link>
              .
            </p>
            <p>
              <strong>Mazání účtu (Google Play):</strong> Uživatel může požádat o smazání účtu a souvisejících osobních údajů
              v rozsahu stanoveném zákonem a provozními důvody (např. dokončené objednávky mohou být uchovány po dobu
              vyžadovanou zákonem nebo oprávněným zájmem). Žádost lze podat v aplikaci (po ověření hesla), na stránce{' '}
              <Link href="/smazatucet" className="text-brand-yellow hover:underline">
                Smazání účtu
              </Link>{' '}
              nebo e-mailem na kontaktní adresu. Žádost podléhá schválení v administraci. O vyřízení budete informováni v
              přiměřené lhůtě. Podrobný popis postupu a uchovávání dat je na stránce{' '}
              <Link href="/smazatucet" className="text-brand-yellow hover:underline">
                /smazatucet
              </Link>
              .
            </p>
          </Section>

          <Section id="objednavky" title="4. Objednávky, ceny a platby">
            <p>
              Objednávky vznikají odesláním poptávky nebo objednávky v rámci Služby, pokud je proces dokončen. Ceny jsou
              uvedeny informativně nebo závazně podle zobrazení v konkrétním kroku objednávky.
            </p>
            <p>
              Platební podmínky (zálohy, fakturace, splatnost) se řídí dohodou mezi stranami a případně samostatnými obchodními
              podmínkami technika či firmy. Provozovatel může zprostředkovávat komunikaci nebo technické zobrazení stavu
              zakázky.
            </p>
            <p>
              Storno podmínek jednotlivé objednávky se řídí dohodou stran a občanským zákoníkem, pokud není sjednáno jinak.
            </p>
            <p>
              <strong className="text-white">Předplatné za přístup ke Službě (licence / využívání platformy).</strong> Pokud je
              v rozhraní Služby nabízeno placené předplatné nebo obdobný poplatek za přístup k funkcím, probíhá platba
              zprostředkováním prostřednictvím platební platformy{' '}
              <strong className="text-white">Stripe</strong> (společnost Stripe, Inc. a související subjekty). Úhradu karty
              nebo jinou platební transakci, vystavení platebních dokladů a správu předplatného v rozsahu platebního vztahu
              upravují zejména obchodní podmínky, ceník a zásady ochrany soukromí Stripe zveřejněné na{' '}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-yellow hover:underline"
              >
                stripe.com
              </a>{' '}
              a v uživatelském rozhraní při platbě. Provozovatel Služby vám umožní přístup k placeným funkcím podle stavu
              úhrady v systému Služby po potvrzení platby (včetně zpracování prostřednictvím webhooků a účtu u Stripe).
            </p>
            <p>
              <strong className="text-white">Správa a ukončení předplatného.</strong> Faktury za předplatné, platební metodu,
              obnovení nebo zrušení předplatného můžete v obvyklém případě spravovat v{' '}
              <strong className="text-white">zákaznickém portálu Stripe</strong> (Customer Billing Portal), k němuž vás Služba
              odkáže z nastavení účtu, pokud je tato funkce aktivní. Nejedná se o oddělenou smlouvu uzavřenou s provozovatelem
              Služby mimo Stripe u každé jednotlivé transakce; právní rámec plateb stanoví Stripe a vámi zvolené podmínky v
              jejich rozhraní. Výpadky platební brány, prodlení potvrzení platby nebo změny u Stripe nejsou vyloučeny;
              provozovatel vynaloží přiměřené úsilí k obnovení přístupu po řádném uhrazení.
            </p>
          </Section>

          <Section id="obsah" title="5. Chování uživatelů a zakázané jednání">
            <p>Uživatel se zavazuje zejména:</p>
            <ul className="list-inside list-disc space-y-1 pl-1 text-gray-300">
              <li>nezasahovat do bezpečnosti nebo dostupnosti Služby, neobcházet technická opatření;</li>
              <li>nenahrávat škodlivý kód, nešířit malware;</li>
              <li>neporušovat práva třetích osob (osobní údaje třetích osob zpracovávat jen s právním titulem);</li>
              <li>nepoužívat Službu k podvodům, spamu nebo nekalosoutěžnímu jednání.</li>
            </ul>
          </Section>

          <Section id="odpovednost" title="6. Odpovědnost a omezení">
            <p>
              Služba je poskytována v stavu „jak je“ (as-is) v rozsahu přiměřeném povaze online platformy. Provozovatel
              neodpovídá za nepřetržitou dostupnost, výpadky třetích stran (hosting, platební brány, e-mail) ani za škodu
              vzniklou vyšší mocí.
            </p>
            <p>
              Odpovědnost provozovatele vůči uživateli je v maximálním rozsahu přípustném právem omezena na újmu vzniklou
              úmyslně nebo hrubou nedbalostí, není-li zákonem stanoveno jinak.
            </p>
          </Section>

          <Section id="dusevni-vlastnictvi" title="7. Duševní vlastnictví">
            <p>
              Rozhraní Služby, texty, grafika, loga a software jsou chráněny právy duševního vlastnictví. Bez předchozího
              souhlasu provozovatele není dovoleno je kopírovat, rozšiřovat ani zneužívat k obchodním účelům mimo běžné
              osobní užití Služby.
            </p>
          </Section>

          <Section id="zmeny" title="8. Změny Podmínek">
            <p>
              Provozovatel může Podmínky měnit. O podstatných změnách je vhodné uživatele informovat (např. e-mailem nebo
              oznámením v aplikaci). Dalším používáním Služby po účinnosti změny vyjadřujete souhlas, pokud zákon nevyžaduje
              výslovný souhlas jiný.
            </p>
          </Section>

          <Section id="gdpr" title="9. Zpracování osobních údajů (GDPR)">
            <p className="font-medium text-white">9.1 Správce a zpracovatelé</p>
            <p>
              Správcem osobních údajů uživatelů Služby je provozovatel uvedený v záhlaví tohoto dokumentu. Provozovatel může
              pověřit zpracováním zpracovatele (např. poskytovatele hostingu, e-mailové infrastruktury, analytických nástrojů
              v rozsahu nezbytném). Seznam zpracovatelů lze vyžádat na kontaktním e-mailu.
            </p>
            <p>
              <strong className="text-white">Platby předplatného (Stripe).</strong> Údaje zadané při platbě předplatného za
              přístup ke Službě (platební karta, fakturační údaje v rozsahu vyžádaném platební bránou) zpracovává v tomto účelu
              poskytovatel platebních služeb <strong className="text-white">Stripe</strong> podle svých zásad a smluvních
              podmínek; provozovatel Služby přijímá od Stripe informace o stavu platby a identifikaci zákazníka v rozsahu nutném
              pro správu přístupu k placeným funkcím. Podrobnosti o zpracování v platebním kanálu jsou uvedeny u Stripe.
            </p>
            <p className="font-medium text-white">9.2 Kategorie osobních údajů</p>
            <p>
              Rozsah v praxi odpovídá přehledu v části{' '}
              <strong className="text-white">„Zásady ochrany soukromí (Privacy Policy) – přehled pro uživatele a obchod Google
              Play“</strong> výše. Můžeme zpracovávat zejména:
            </p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>identifikační a kontaktní údaje (jméno, e-mail, telefon) a údaje účtu včetně role a nastavení;</li>
              <li>přihlašovací údaje: e-mail a hash hesla (heslo v nečitelné podobě);</li>
              <li>údaje o objednávkách revizí, nemovitostech (je-li funkce použita), komunikaci v rámci zakázek a zprávách;</li>
              <li>
                <strong className="text-white">soubory a média</strong> nahraná uživatelem — dokumenty (např. PDF) a{' '}
                <strong className="text-white">fotografie</strong> k zakázkám (pořízení nebo výběr z galerie přes systémové
                rozhraní zařízení);
              </li>
              <li>
                technické údaje: IP adresa u požadavků na server, provozní logy, cookies / token relace pro přihlášení
                (NextAuth), informace z HTTP hlaviček (např. uživatelský agent prohlížeče);
              </li>
              <li>
                u předplatného: údaje o stavu úhrady a přístupu k placeným funkcím, identifikátor zákazníka u platebního
                zprostředkovatele (např. Stripe) v rozsahu předaném do Služby.
              </li>
            </ul>
            <p className="font-medium text-white">9.3 Účely a právní základy</p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>
                <strong>Poskytování Služby, smlouva</strong> (čl. 6 odst. 1 písm. b) GDPR) — vedení účtu, objednávky,
                komunikace.
              </li>
              <li>
                <strong>Oprávněné zájmy</strong> (čl. 6 odst. 1 písm. f) GDPR) — bezpečnost, prevence zneužití, statistiky
                provozu, vymáhání práv.
              </li>
              <li>
                <strong>Právní povinnost</strong> (čl. 6 odst. 1 písm. c) GDPR) — účetní a daňové doklady, odpovědi na
                žádosti úřadů.
              </li>
              <li>
                <strong>Souhlas</strong> (čl. 6 odst. 1 písm. a) GDPR) — např. marketingové zprávy nebo nepovinné cookies —
                pouze po výslovném souhlasu a s možností odvolání.
              </li>
            </ul>
            <p className="font-medium text-white">9.4 Doba uchování</p>
            <p>
              Údaje uchováváme po dobu trvání účtu a následně po dobu nezbytnou pro splnění závazků a oprávněných zájmů,
              nejdéle však po dobu stanovenou zákonem (např. archivace účetních dokladů). Logy mohou být uchovány kratší
              dobu podle rotace systému.
            </p>
            <p className="font-medium text-white">9.5 Předávání a třetí země</p>
            <p>
              Pokud využíváme služby s infrastrukturou mimo EU/EHP, zajistíme odpovídající záruky (např. standardní smluvní
              doložky EU) v souladu s čl. 46 GDPR.
            </p>
            <p className="font-medium text-white">9.6 Vaše práva</p>
            <p>Máte právo na:</p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>přístup k osobním údajům;</li>
              <li>opravu nepřesných údajů;</li>
              <li>výmaz („právo být zapomenut“), pokud nejsou dány jiné převažující důvody;</li>
              <li>omezení zpracování za podmínek GDPR;</li>
              <li>přenositelnost údajů u údajů zpracovávaných automatizovaně na základě smlouvy nebo souhlasu;</li>
              <li>námitku proti zpracování z oprávněného zájmu;</li>
              <li>odvolat souhlas se zpracováním založeným na souhlasu.</li>
            </ul>
            <p>
              Žádosti podávejte na kontaktní e-mail provozovatele. Odpovíme bez zbytečného odkladu, obvykle do jednoho měsíce.
            </p>
            <p className="font-medium text-white">9.7 Právo podat stížnost</p>
            <p>
              Máte právo podat stížnost u dozorového úřadu:{' '}
              <a
                href="https://www.uoou.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-yellow hover:underline"
              >
                Úřad pro ochranu osobních údajů (ÚOOÚ)
              </a>
              , Pplk. Sochora 27, 170 00 Praha 7.
            </p>
          </Section>

          <Section id="cookies" title="10. Cookies a podobné technologie">
            <p>
              Webová část Služby používá <strong className="text-white">cookies a související mechanismy</strong> potřebné pro
              fungování přihlášení (session NextAuth / JWT) a bezpečnost. V aktuální verzi{' '}
              <strong className="text-white">nepoužíváme Google Analytics</strong> ani jiné marketingové / analytické skripty
              třetích stran ve zdrojovém kódu aplikace — jde primárně o technickou relaci. V mobilním klientovi / PWA platí
              obdobné principy ukládání relace. Nepovinné cookies (např. marketing) by byly zavedeny jen s výslovným souhlasem a
              úpravou tohoto textu.
            </p>
          </Section>

          <Section id="google-play" title="11. Mobilní aplikace a Google Play">
            <p>
              Pokud je Služba distribuována prostřednictvím <strong>Google Play</strong>, berete na vědomí, že platí také{' '}
              <a
                href="https://play.google.com/about/play-terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-yellow hover:underline"
              >
                podmínky služby Google Play
              </a>{' '}
              a příslušné zásady Google (včetně zásad pro vývojáře a pravidel obsahu). V případě rozporu mezi těmito Podmínkami
              a pravidly Google pro konkrétní otázku distribuce aplikace mají přednost ustanovení vyžadovaná Googlem v
              nezbytném rozsahu.
            </p>
            <p>
              <strong>Oprávnění a zařízení:</strong> Pro nahrání dokumentů nebo fotografií k zakázce využívá rozhraní výběr
              souboru; na mobilu může systém nabídnout <strong className="text-white">přístup ke galerii nebo fotoaparátu</strong>{' '}
              v okamžiku, kdy uživatel zvolí pořízení nebo výběr obrázku — jde o standardní chování OS. Nepožadujeme trvalý přístup
              ke kontaktům ani k poloze; geolokace v aplikaci není funkcí Služby. Popis sběru dat pro Data safety v konzoli
              Google Play odpovídá sekci Privacy Policy výše a oddílu 9.
            </p>
            <p>
              <strong>Data safety (bezpečnost údajů):</strong> Shromažďované údaje odpovídají popisu v sekci GDPR výše.
              Údaje neprodáváme. Přístup mají pouze oprávněné osoby a techničtí zpracovatelé v nezbytném rozsahu.
            </p>
            <p>
              <strong>Děti:</strong> Služba není určena osobám mladším 16 let bez souhlasu zákonného zástupce. Pokud
              zjistíme, že zpracováváme údaje dítěte bez právního základu, provedeme jejich výmaz.
            </p>
          </Section>

          <Section id="zaver" title="12. Závěrečná ustanovení">
            <p>
              Tyto Podmínky se řídí právem <strong>České republiky</strong>. Příslušnost k řešení sporů mají věcně a místně
              příslušné soudy České republiky, pokud zákon nestanoví jinak pro spotřebitele.
            </p>
            <p>
              Pokud některé ustanovení bude neplatné, zůstává platnost ostatních ustanovení nedotčena.
            </p>
          </Section>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-center text-sm text-gray-500">
          <p className="mb-4">
            Máte dotaz? Napište na{' '}
            <a href="mailto:info@revizone.cz" className="text-brand-yellow hover:underline">
              info@revizone.cz
            </a>
            .
          </p>
          <Link href="/login" className="text-brand-yellow hover:underline">
            Přihlášení do Revizone
          </Link>
        </div>
      </main>
    </div>
  );
}
