import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Lightbulb, PenLine, ShieldCheck, ImageIcon, Send, MailCheck, BarChart3,
  Clock, AlertTriangle, Wrench, Server, HelpCircle,
} from "lucide-react";

/**
 * Helppagina: één plek waar de volledige werking van de machine staat.
 * Bij elke wijziging aan de keten, het ritme of de instellingen: deze pagina bijwerken.
 */

const KETEN = [
  {
    icon: Lightbulb,
    titel: "1. Idee",
    wat: "De machine bedenkt onderwerpen (hooks) per klant.",
    detail:
      "Negen invalshoeken worden verplicht gespreid (casus, stelling, mythe, vraag, actualiteit, fout, how-to, cijfer, contrarian) — maximaal 2 dezelfde per ronde. De laatste 40 hooks van die klant zijn verboden terrein, zodat je nooit twee keer hetzelfde krijgt. Bronnen: vaste thema's, actueel nieuws uit RSS en wat aantoonbaar goed werkte (40/40/20).",
  },
  {
    icon: PenLine,
    titel: "2. Tekst",
    wat: "Van hook naar post: twee varianten, een redacteur kiest de beste.",
    detail:
      "Er worden twee verschillende versies geschreven. Een strenge redacteur scoort ze (0-100) op toon, platform-fit en clichés, kiest de beste en herschrijft die als de score onder de 75 ligt. X-posts die te lang zijn worden netjes ingekort — niet afgekapt.",
  },
  {
    icon: ShieldCheck,
    titel: "3. Kwaliteitspoort",
    wat: "Claude beoordeelt of de post naar buiten mag.",
    detail:
      "Getoetst aan de merkregels van de klant (doelgroep, tone of voice, do's & don'ts, feiten-bank) plus een vaste rubriek. Afgekeurd? Dan wordt de post één keer automatisch herschreven mét de feedback. Twee keer afgekeurd = hij gaat niet uit, maar komt in de vrijdagmail.",
  },
  {
    icon: ImageIcon,
    titel: "4. Beeld",
    wat: "Een sjabloonkaart in de huisstijl van de klant.",
    detail:
      "Vaste kleuren, vaste typografie, vaste afzenderregel — alleen de kernzin wisselt. Eén sjabloon per klant. Staat het sjabloon uit, dan valt de machine terug op vrij gegenereerd AI-beeld.",
  },
  {
    icon: Send,
    titel: "5. Publicatie",
    wat: "Als concept (draft) in Buffer — nooit direct live.",
    detail:
      "De autopilot pakt de oudste goedgekeurde post en zet die als draft in de Buffer van die klant. Alleen posts die de poort zijn gepasseerd komen in aanmerking. Live zetten doe jij, met één klik in Buffer.",
  },
  {
    icon: MailCheck,
    titel: "6. Jouw review",
    wat: "Elke vrijdag 16:00 een mail met alles wat klaarstaat.",
    detail:
      "De mail bevat de open drafts (klaar om live te zetten) en de posts die de poort afkeurde, mét de reden. Dat is je hele werk: circa een half uur per week.",
  },
  {
    icon: BarChart3,
    titel: "7. Leren",
    wat: "Resultaten uit Buffer sturen de volgende ronde.",
    detail:
      "Elke ochtend worden reacties, clicks en weergaven opgehaald. Per invalshoek wordt bijgehouden wat het beste werkt; die invalshoeken krijgen bij de volgende ideeën-ronde meer gewicht. Zichtbaar onder Inzicht → Prestaties per invalshoek.",
  },
];

const RITME = [
  { wanneer: "Elke dag 06:00", wat: "Nieuwsartikelen ophalen uit de RSS-feeds van actieve klanten", flow: "rss-ingest" },
  { wanneer: "Elke ochtend", wat: "Resultaten (reacties/clicks) uit Buffer ophalen", flow: "sync-engagement" },
  { wanneer: "Ma / wo / vr 08:00", wat: "1 goedgekeurde post als draft naar Buffer + nieuwe content maken + voorraad aanvullen", flow: "autopilot-interai" },
  { wanneer: "Vrijdag 16:00", wat: "Reviewmail: open drafts + afgekeurde posts met feedback", flow: "weekly-review-interai" },
  { wanneer: "Bij een storing", wat: "Alertmail als een publicatie mislukt of een taak crasht", flow: "post-to-buffer" },
];

const RUBRIEK = [
  { punt: "Feitelijk juist", uitleg: "Geen verzonnen percentages, bedragen of aantallen. Cijfers mogen alleen uit de feiten-bank of een genoemd nieuwsartikel. Gewone vakkennis mag wél." },
  { punt: "Geen AI-clichés", uitleg: "Geen \"In de wereld van…\", \"Ontdek hoe…\", \"game-changer\", holle superlatieven." },
  { punt: "Concrete hook", uitleg: "De eerste zin is specifiek en pakkend, geen algemene opening." },
  { punt: "Nederlandse B2B-toon", uitleg: "Natuurlijk Nederlands, professioneel maar menselijk, passend bij de tone of voice van de klant." },
  { punt: "CTA aanwezig", uitleg: "Een link, vraag of concrete eerste stap. Een download wordt alleen beloofd als er echt een download-link is." },
  { punt: "Platform-fit", uitleg: "X maximaal 280 tekens; Instagram zonder klikbare links; LinkedIn substantieel genoeg." },
];

export default function Help() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help</h1>
        <p className="text-muted-foreground">
          De volledige werking van de machine op één plek — zodat je nergens naar hoeft te zoeken.
        </p>
      </div>

      {/* Kern in één zin */}
      <Card className="gradient-card">
        <CardContent className="py-4 px-5">
          <p className="text-sm text-foreground leading-relaxed">
            <b>In één zin:</b> de machine bedenkt onderwerpen, schrijft posts, laat ze door een kwaliteitspoort,
            zet ze als <b>concept in Buffer</b> en mailt je elke vrijdag wat klaarstaat. Jij zet met één klik live
            wat je goed vindt. Er gaat <b>nooit</b> iets automatisch live.
          </p>
        </CardContent>
      </Card>

      {/* De keten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hoe een post ontstaat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {KETEN.map((s) => (
            <div key={s.titel} className="flex gap-3 p-3 rounded-lg border border-border">
              <s.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {s.titel} — <span className="font-normal">{s.wat}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ritme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Het weekritme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {RITME.map((r) => (
              <div key={r.flow} className="flex items-start gap-3 text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                <span className="w-36 shrink-0 font-medium text-foreground">{r.wanneer}</span>
                <span className="flex-1 text-muted-foreground">{r.wat}</span>
                <Badge variant="outline" className="text-[10px] shrink-0 font-normal">{r.flow}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Frequentie per klant staat in het tenant-contract (3 posts/week voor InterAI), niet in dit scherm.
          </p>
        </CardContent>
      </Card>

      {/* Poort */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Waar de kwaliteitspoort op let
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {RUBRIEK.map((r) => (
              <div key={r.punt} className="text-sm">
                <span className="font-medium text-foreground">{r.punt}</span>
                <span className="text-muted-foreground"> — {r.uitleg}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-accent/40 text-xs text-foreground leading-relaxed">
            <b>Belangrijk om te weten:</b> de <b>feiten-bank</b> van een klant is de enige toegestane bron voor cijfers
            en claims. Wat daar staat, beschouwt de poort als waar en mag dus in posts terechtkomen. Zet er daarom
            alleen in wat je publiek wilt verdedigen. Staat de feiten-bank leeg, dan schrijft de machine bewust
            zonder cijfers ("merkbaar minder administratie" in plaats van "25% minder").
          </div>
        </CardContent>
      </Card>

      {/* Wat stel je waar in */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> Wat stel je waar in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Klanten → klant openen</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              <b>Content-DNA</b> (feiten-bank, voorbeeldposts, do's &amp; don'ts) — dit stuurt de schrijfstijl én de poort.
              <b> Conversie</b> (afspraaklink, e-book/download). <b>Publicatie</b> (Buffer-token en kanalen).
              <b> Beeld</b> (kleur, sjabloon-overrides). Dit is de plek met de meeste invloed op kwaliteit.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Instellingen</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Het tekstmodel (nu gpt-4.1) en de endpoints. Het beoordelingsmodel van de poort is Claude.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Maken</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Handmatig onderwerpen genereren of trends ophalen, en ideeën goedkeuren of weggooien. De autopilot vult
              de voorraad zelf aan als die leeg raakt — dit is dus optioneel.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Wachtrij</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Posts bekijken, tekst bewerken, afkeuren met reden (die reden leert de machine voor de volgende keer)
              en een A/B-variant maken.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Inzicht</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Weergaven, interacties en welke invalshoek het beste presteert per klant.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Afwijkingen — eerlijk over de huidige stand */}
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Let op — huidige afwijkingen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground">De goedkeurknop in de Wachtrij publiceert niets</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Sinds 15-07-2026 staat de oude scheduler uit (die publiceerde live, langs de poort heen). Er is dus geen
              enkel proces meer dat op "goedgekeurd" reageert. <b>Je review loopt via de Buffer-drafts en de
              vrijdagmail.</b> Goedkeuren in de app is nu hooguit een aantekening voor jezelf.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">"Weekbehoefte" op Vandaag klopt niet</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Dat getal komt uit de oude campagne-instellingen (allemaal uitgezet). De echte frequentie staat in het
              tenant-contract: 3 posts per week voor InterAI.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Posts die al als draft in Buffer staan, tonen hier nog als "te beoordelen"</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Dit scherm kent de status "draft" nog niet. Publiceer zo'n post niet nogmaals vanuit de app — dan krijg
              je een dubbele post. Werk vanuit Buffer.
            </p>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Deze drie punten worden opgelost zodra dit scherm zelf aan de beurt is.
          </p>
        </CardContent>
      </Card>

      {/* Onder de motorkap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" /> Waar draait wat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            ["Deze app", "Alleen bediening en inzicht. Doet zelf geen generatie of publicatie."],
            ["Motor", "Supabase edge functions: onderwerpen, tekst, poort, beeld, resultaten. Code staat in de repo mm-edge-functions; een push naar main deployt automatisch."],
            ["Planning", "Kestra (flow.southparc.nl) start de flows op tijd en roept de motor aan."],
            ["Publicatie", "Buffer — elke klant een eigen account, zodat de klant ook zelf kan posten."],
            ["Mail", "Reviewmail en alerts lopen via de centrale mailroute (outbox → Resend)."],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="w-24 shrink-0 font-medium text-foreground">{k}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">{v}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Als er iets misgaat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Als er iets misgaat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="leeg">
              <AccordionTrigger className="text-sm">Er staat niets in de wachtrij</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                De autopilot draait maandag, woensdag en vrijdag om 08:00 en zet dan één post klaar. Tussendoor blijft
                het stil — dat is normaal. Staat er na een run nog niets, dan is er waarschijnlijk geen post die de
                poort is gepasseerd; dat zie je vrijdag in de reviewmail terug als afkeuring mét reden.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="afgekeurd">
              <AccordionTrigger className="text-sm">Veel posts worden afgekeurd</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Lees de reden in de vrijdagmail. Meestal is de oorzaak dat de klant geen feiten-bank heeft (dan mag de
                machine geen cijfers gebruiken) of dat de do's &amp; don'ts te streng staan. Beide staan bij Klanten →
                klant → Content-DNA.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="alert">
              <AccordionTrigger className="text-sm">Ik kreeg een alertmail over een mislukte publicatie</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Buffer weigerde de post of de publicatietaak crashte. Meestal is het Buffer-token van die klant
                verlopen — vernieuw het bij Klanten → klant → Publicatie. De alert bevat de exacte Buffer-melding.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="toon">
              <AccordionTrigger className="text-sm">De posts klinken niet als de klant</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Zet 2 tot 3 posts die je goed vindt bij Klanten → klant → Content-DNA → voorbeeldposts. Dat werkt beter
                dan de tone of voice aanpassen: de machine kopieert de stijl, niet de inhoud. Afkeuren mét reden in de
                Wachtrij helpt ook — die redenen gaan mee naar volgende rondes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="herhaling">
              <AccordionTrigger className="text-sm">Ik zie steeds dezelfde onderwerpen</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                De laatste 40 hooks worden al geblokkeerd. Blijft het eentonig, dan is de thema-lijst van de klant te
                smal of komen er geen nieuwe nieuwsartikelen binnen. Beide zitten in het tenant-contract (thema's en
                RSS-feeds).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nieuwe-klant">
              <AccordionTrigger className="text-sm">Ik wil een nieuwe klant toevoegen</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Klant aanmaken en het Content-DNA vullen, daarna het tenant-contract invullen (thema's, feeds,
                frequentie, sjabloon) en een eigen autopilot aanzetten. Dat laatste kan nog niet via dit scherm — de
                volledige checklist staat in tenant-template.md bij het project.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Klopt er iets niet met wat hier staat? Dan is deze pagina achterstallig — meld het, dan wordt zowel de machine
        als deze uitleg bijgewerkt.
      </p>
    </div>
  );
}
