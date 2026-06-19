import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, Loader2, Eye, EyeOff, AlertCircle, ExternalLink, Linkedin, Twitter, Instagram } from "lucide-react";
import { useClients, useUpdateClient, MmClient } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";

type PlatformKey = "linkedin" | "x" | "twitter" | "instagram";
const PLATFORMS: { key: PlatformKey; label: string; icon: any }[] = [
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "x", label: "X", icon: Twitter },
  { key: "twitter", label: "Twitter (legacy)", icon: Twitter },
  { key: "instagram", label: "Instagram", icon: Instagram },
];

interface ClientForm {
  name: string;
  doelgroep: string;
  tone_of_voice: string;
  branding: string;
  hashtags: string;
  cta_url: string;
  read_url: string;
  lead_magnet: string;
  buffer_token: string;
  buffer_profiles: Record<string, string>;
}

function emptyForm(c: MmClient): ClientForm {
  return {
    name: c.name ?? "",
    doelgroep: c.doelgroep ?? "",
    tone_of_voice: c.tone_of_voice ?? "",
    branding: c.branding ?? "",
    hashtags: c.hashtags ?? "",
    cta_url: c.cta_url ?? "",
    read_url: c.read_url ?? "",
    lead_magnet: c.lead_magnet ?? "",
    buffer_token: c.buffer_token ?? "",
    buffer_profiles: (c.buffer_profiles as Record<string, string>) ?? {},
  };
}

function isIncomplete(c: MmClient): boolean {
  const hasToken = !!c.buffer_token?.trim();
  const profiles = (c.buffer_profiles as Record<string, string>) ?? {};
  const hasAnyProfile = Object.values(profiles).some((v) => !!v?.trim());
  return !hasToken || !hasAnyProfile;
}

function ClientEditor({ client }: { client: MmClient }) {
  const updateClient = useUpdateClient();
  const { toast } = useToast();
  const [form, setForm] = useState<ClientForm>(() => emptyForm(client));
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    setForm(emptyForm(client));
  }, [client.id]);

  const saveBlock = (label: string, patch: Partial<MmClient>) => {
    updateClient.mutate(
      { id: client.id, ...patch },
      {
        onSuccess: () =>
          toast({ title: `${label} opgeslagen`, description: `${form.name || client.name} is bijgewerkt.` }),
        onError: (err) =>
          toast({
            title: "Opslaan mislukt",
            description: err instanceof Error ? err.message : "Onbekende fout",
            variant: "destructive",
          }),
      },
    );
  };

  const setProfile = (key: string, value: string) =>
    setForm((p) => ({ ...p, buffer_profiles: { ...p.buffer_profiles, [key]: value } }));

  // Bij opslaan lege platforms weglaten
  const cleanedProfiles = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(form.buffer_profiles)) {
      if (v && v.trim()) out[k] = v.trim();
    }
    return out;
  };

  return (
    <div className="space-y-6">
      {/* 1. Profiel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profiel</CardTitle>
          <CardDescription>Naam, doelgroep en stem die elke gegenereerde post sturen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Naam</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label>Doelgroep</Label>
            <Textarea
              rows={2}
              value={form.doelgroep}
              onChange={(e) => setForm((p) => ({ ...p, doelgroep: e.target.value }))}
            />
          </div>
          <div>
            <Label>Tone of voice</Label>
            <Textarea
              rows={3}
              value={form.tone_of_voice}
              onChange={(e) => setForm((p) => ({ ...p, tone_of_voice: e.target.value }))}
              placeholder="Bijv. nuchter, deskundig en collegiaal. Geen verkooppraat..."
            />
          </div>
          <div>
            <Label>Branding</Label>
            <Textarea
              rows={2}
              value={form.branding}
              onChange={(e) => setForm((p) => ({ ...p, branding: e.target.value }))}
            />
          </div>
          <div>
            <Label>Hashtags</Label>
            <Input
              value={form.hashtags}
              onChange={(e) => setForm((p) => ({ ...p, hashtags: e.target.value }))}
              placeholder="#voorbeeld #nog-een"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveBlock("Profiel", {
                  name: form.name,
                  doelgroep: form.doelgroep,
                  tone_of_voice: form.tone_of_voice,
                  branding: form.branding,
                  hashtags: form.hashtags,
                })
              }
              disabled={updateClient.isPending}
            >
              {updateClient.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Profiel opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links</CardTitle>
          <CardDescription>CTA, lees-link en lead magnet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>CTA-link (aanmelden / lead magnet)</Label>
            <Input
              type="url"
              value={form.cta_url}
              onChange={(e) => setForm((p) => ({ ...p, cta_url: e.target.value }))}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Wordt gebruikt voor de call-to-action in posts.
            </p>
          </div>
          <div>
            <Label>Lees-link (site)</Label>
            <Input
              type="url"
              value={form.read_url}
              onChange={(e) => setForm((p) => ({ ...p, read_url: e.target.value }))}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Wordt gebruikt voor "lees meer op de site"-verwijzingen. Nooit dezelfde als de CTA als die naar een
              aanmeldpagina wijst.
            </p>
          </div>
          <div>
            <Label>Lead magnet (beschrijving)</Label>
            <Textarea
              rows={2}
              value={form.lead_magnet}
              onChange={(e) => setForm((p) => ({ ...p, lead_magnet: e.target.value }))}
              placeholder="Bijv. gratis gids over X die de lezer kan downloaden..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveBlock("Links", {
                  cta_url: form.cta_url,
                  read_url: form.read_url,
                  lead_magnet: form.lead_magnet,
                })
              }
              disabled={updateClient.isPending}
            >
              {updateClient.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Links opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Kanalen (Buffer) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kanalen (Buffer)</CardTitle>
          <CardDescription>
            Eigen Buffer-token en channel-ID's per platform. Lege platforms worden niet opgeslagen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Buffer API-token</Label>
            <div className="flex gap-2">
              <Input
                type={showToken ? "text" : "password"}
                value={form.buffer_token}
                onChange={(e) => setForm((p) => ({ ...p, buffer_token: e.target.value }))}
                placeholder="Token uit publish.buffer.com/settings/api"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken((s) => !s)}
                title={showToken ? "Verbergen" : "Tonen"}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Channel-ID's per platform</Label>
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const value = form.buffer_profiles[platform.key] || "";
              return (
                <div key={platform.key} className="grid grid-cols-[140px_1fr] items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Icon className="h-3.5 w-3.5" /> {platform.label}
                  </div>
                  <Input
                    value={value}
                    onChange={(e) => setProfile(platform.key, e.target.value)}
                    placeholder="Channel-ID (leeg = niet publiceren)"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveBlock("Kanalen", {
                  buffer_token: form.buffer_token,
                  buffer_profiles: cleanedProfiles(),
                })
              }
              disabled={updateClient.isPending}
            >
              {updateClient.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Kanalen opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link to={`/campagne?client=${client.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Naar campagnes van {client.name}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function InstellingenKlanten() {
  const { data: clients, isLoading } = useClients();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Klant-instellingen</h1>
        <p className="text-muted-foreground">
          Alle configuratie per klant — profiel, links en publicatiekanalen. Wijzigingen worden direct opgeslagen in{" "}
          <code className="text-xs">mm_clients</code>.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !clients || clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nog geen klanten. Voeg eerst een klant toe via Beheer → Klanten.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {clients.map((client) => {
            const incomplete = isIncomplete(client);
            return (
              <AccordionItem
                key={client.id}
                value={client.id}
                className="border rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">{client.name}</span>
                    {incomplete ? (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                        <AlertCircle className="h-3 w-3" /> onvolledig
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">klaar voor publicatie</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ClientEditor client={client} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
