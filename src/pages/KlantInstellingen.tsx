import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, RefreshCw, Save, Linkedin, Twitter, Instagram, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients, useUpdateClient, useSettings } from "@/hooks/use-marketing-data";
import { callWebhook, getErrorMessage } from "@/lib/webhooks";
import { supabase } from "@/integrations/supabase/client";
import { IMAGE_PROVIDERS, IMAGE_MODELS, IMAGE_QUALITIES } from "@/lib/image-options";
import { useToast } from "@/hooks/use-toast";

// Sentinel voor "gebruik globale default" (Radix Select staat geen lege value toe)
const USE_GLOBAL = "__default__";

interface BufferChannel {
  id: string;
  service: string;
  name: string;
  isDisconnected: boolean;
}

// Buffer noemt X nog "twitter"
const PLATFORMS: { key: string; bufferService: string; label: string; icon: any }[] = [
  { key: "linkedin", bufferService: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "x", bufferService: "twitter", label: "X", icon: Twitter },
  { key: "instagram", bufferService: "instagram", label: "Instagram", icon: Instagram },
];

export default function KlantInstellingen() {
  const { id } = useParams<{ id: string }>();
  const { data: clients, isLoading } = useClients();
  const { data: settings } = useSettings();
  const updateClient = useUpdateClient();
  const { toast } = useToast();

  const client = clients?.find((c) => c.id === id);

  const [form, setForm] = useState({
    name: "",
    doelgroep: "",
    tone_of_voice: "",
    hashtags: "",
    branding: "",
    banner_color: "",
    cta_url: "",
    lead_magnet: "",
    lead_magnet_url: "",
    buffer_token: "",
    buffer_profiles: {} as Record<string, string>,
    img_provider: USE_GLOBAL,
    img_model: USE_GLOBAL,
    img_quality: USE_GLOBAL,
    img_style_prompt: "",
    img_negative_prompt: "",
    brand_colors_text: "",
    img_seed: "",
  });
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [uploadingEbook, setUploadingEbook] = useState(false);

  // Upload een e-book/gids naar de publieke downloads-bucket en zet de URL in het formulier.
  const handleEbookUpload = async (file: File) => {
    if (!id) return;
    setUploadingEbook(true);
    try {
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("mm-downloads")
        .upload(path, file, { upsert: true, contentType: file.type || "application/pdf" });
      if (error) throw error;
      const { data } = supabase.storage.from("mm-downloads").getPublicUrl(path);
      setForm((p) => ({ ...p, lead_magnet_url: data.publicUrl }));
      toast({ title: "E-book geüpload", description: "Klik op Opslaan om het vast te leggen.", });
      void ext;
    } catch (err) {
      toast({ title: "Upload mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setUploadingEbook(false);
  };

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name ?? "",
        doelgroep: client.doelgroep ?? "",
        tone_of_voice: client.tone_of_voice ?? "",
        hashtags: client.hashtags ?? "",
        branding: client.branding ?? "",
        banner_color: client.banner_color ?? "",
        cta_url: client.cta_url ?? "",
        lead_magnet: client.lead_magnet ?? "",
        lead_magnet_url: client.lead_magnet_url ?? "",
        buffer_token: client.buffer_token ?? "",
        buffer_profiles: (client.buffer_profiles as Record<string, string>) ?? {},
        img_provider: client.img_provider || USE_GLOBAL,
        img_model: client.img_model || USE_GLOBAL,
        img_quality: client.img_quality || USE_GLOBAL,
        img_style_prompt: client.img_style_prompt ?? "",
        img_negative_prompt: client.img_negative_prompt ?? "",
        brand_colors_text: Array.isArray(client.brand_colors) ? client.brand_colors.join(", ") : "",
        img_seed: client.img_seed != null ? String(client.img_seed) : "",
      });
    }
  }, [client?.id]);

  const imgModels = IMAGE_MODELS[form.img_provider === USE_GLOBAL ? "openai" : form.img_provider] ?? IMAGE_MODELS.openai;

  const handleFetchChannels = async () => {
    const webhook = settings?.webhook_buffer_channels;
    if (!webhook?.trim()) {
      toast({ title: "Geen kanalen-webhook ingesteld", description: "Voeg webhook_buffer_channels toe bij Instellingen.", variant: "destructive" });
      return;
    }
    if (!form.buffer_token.trim()) {
      toast({ title: "Vul eerst het Buffer-token in en sla op", variant: "destructive" });
      return;
    }
    setLoadingChannels(true);
    try {
      const data = await callWebhook({ webhookUrl: webhook, payload: { client_id: id } });
      const list = (data && typeof data === "object" ? (data as { channels?: BufferChannel[] }).channels : []) || [];
      if (!list.length) throw new Error("Geen kanalen gevonden — klopt het token en zijn er kanalen gekoppeld in Buffer?");
      setChannels(list);
      // Vul automatisch in wanneer er per platform precies één kanaal is
      setForm((p) => {
        const profiles = { ...p.buffer_profiles };
        for (const platform of PLATFORMS) {
          const matches = list.filter((ch) => ch.service === platform.bufferService && !ch.isDisconnected);
          if (matches.length === 1 && !profiles[platform.key]) profiles[platform.key] = matches[0].id;
        }
        return { ...p, buffer_profiles: profiles };
      });
      toast({ title: `${list.length} kanalen opgehaald uit Buffer ✅` });
    } catch (err) {
      toast({ title: "Kanalen ophalen mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setLoadingChannels(false);
  };

  const handleSave = () => {
    if (!id) return;
    const brandColors = form.brand_colors_text
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter(Boolean);
    const seedNum = form.img_seed.trim() ? Number(form.img_seed) : null;
    const payload = {
      name: form.name,
      doelgroep: form.doelgroep,
      tone_of_voice: form.tone_of_voice,
      hashtags: form.hashtags,
      branding: form.branding,
      banner_color: form.banner_color || null,
      cta_url: form.cta_url,
      lead_magnet: form.lead_magnet,
      lead_magnet_url: form.lead_magnet_url || null,
      buffer_token: form.buffer_token,
      buffer_profiles: form.buffer_profiles,
      // Beeld-overrides: sentinel/leeg => null (val terug op globale default)
      img_provider: form.img_provider === USE_GLOBAL ? null : form.img_provider,
      img_model: form.img_model === USE_GLOBAL ? null : form.img_model,
      img_quality: form.img_quality === USE_GLOBAL ? null : form.img_quality,
      img_style_prompt: form.img_style_prompt.trim() || null,
      img_negative_prompt: form.img_negative_prompt.trim() || null,
      brand_colors: brandColors.length ? brandColors : null,
      img_seed: seedNum != null && !Number.isNaN(seedNum) ? seedNum : null,
    };
    updateClient.mutate(
      { id, ...payload },
      {
        onSuccess: () => toast({ title: "Instellingen opgeslagen", description: `${form.name} is bijgewerkt.` }),
        onError: (err) => toast({ title: "Opslaan mislukt", description: getErrorMessage(err), variant: "destructive" }),
      },
    );
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Klant niet gevonden.</p>
        <Button variant="outline" asChild><Link to="/klanten"><ArrowLeft className="h-4 w-4 mr-2" /> Terug naar klanten</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/klanten"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-muted-foreground">Klantinstellingen — profiel, conversie en publicatie</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateClient.isPending}>
          {updateClient.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Opslaan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profiel & tone of voice</CardTitle>
          <CardDescription>Deze velden sturen elke gegenereerde post voor deze klant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Naam</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label>Doelgroep</Label>
            <Textarea rows={2} value={form.doelgroep} onChange={(e) => setForm((p) => ({ ...p, doelgroep: e.target.value }))} />
          </div>
          <div>
            <Label>Tone of voice</Label>
            <Textarea rows={3} value={form.tone_of_voice} onChange={(e) => setForm((p) => ({ ...p, tone_of_voice: e.target.value }))} placeholder="Bijv. nuchter, deskundig en collegiaal. Geen verkooppraat, geen emoji's..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Hashtags</Label>
              <Input value={form.hashtags} onChange={(e) => setForm((p) => ({ ...p, hashtags: e.target.value }))} />
            </div>
            <div>
              <Label>Branding</Label>
              <Input value={form.branding} onChange={(e) => setForm((p) => ({ ...p, branding: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Kleur van de klantbanner</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={form.banner_color || "#1a3a5f"}
                onChange={(e) => setForm((p) => ({ ...p, banner_color: e.target.value }))}
                className="h-9 w-12 rounded border border-border bg-transparent p-0.5 cursor-pointer"
                aria-label="Bannerkleur"
              />
              <Input value={form.banner_color} onChange={(e) => setForm((p) => ({ ...p, banner_color: e.target.value }))} placeholder="#1a3a5f" className="max-w-[140px]" />
              {form.banner_color && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, banner_color: "" }))}>wissen</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tint de balk bovenaan en de stip bij de klantnaam. Leeg = neutraal.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversie</CardTitle>
          <CardDescription>
            Twee soorten call-to-action: een afspraak/contactlink en (optioneel) een downloadbaar e-book.
            De AI belooft alléén een download als hieronder een e-book staat — anders wordt de link als afspraak gebracht.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Afspraak- / contactlink</Label>
            <Input type="url" value={form.cta_url} onChange={(e) => setForm((p) => ({ ...p, cta_url: e.target.value }))} placeholder="https://... (bijv. afsprakenpagina)" />
            <p className="text-xs text-muted-foreground mt-1">Gebruikt als uitnodiging voor een kennismaking of afspraak. Krijgt automatisch UTM-tracking per platform en campagne.</p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <Label>E-book / gids (download) — optioneel</Label>
              <p className="text-xs text-muted-foreground mt-1">Upload een PDF of plak een directe download-URL. Zolang dit leeg is, belooft de AI géén e-book in de posts.</p>
            </div>
            <Input type="url" value={form.lead_magnet_url} onChange={(e) => setForm((p) => ({ ...p, lead_magnet_url: e.target.value }))} placeholder="https://... directe download-link" />
            <div className="flex items-center gap-3 flex-wrap">
              <input
                id="ebook-file"
                type="file"
                accept=".pdf,.epub,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEbookUpload(f); e.target.value = ""; }}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploadingEbook} onClick={() => document.getElementById("ebook-file")?.click()}>
                {uploadingEbook ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                PDF uploaden
              </Button>
              {form.lead_magnet_url && (
                <>
                  <a href={form.lead_magnet_url} target="_blank" rel="noopener" className="text-xs text-primary underline">huidig bestand bekijken</a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, lead_magnet_url: "" }))}>wissen</Button>
                </>
              )}
            </div>
            <div>
              <Label className="text-xs">Omschrijving (wat de lezer krijgt)</Label>
              <Textarea rows={2} value={form.lead_magnet} onChange={(e) => setForm((p) => ({ ...p, lead_magnet: e.target.value }))} placeholder="Bijv. gratis gids 'Beleggen voor beginners'..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Publicatie (Buffer)</CardTitle>
          <CardDescription>
            Elke klant gebruikt een eigen Buffer-account: de klant kan daar ook zelf handmatig posten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Buffer API-token</Label>
            <Input type="password" value={form.buffer_token} onChange={(e) => setForm((p) => ({ ...p, buffer_token: e.target.value }))} placeholder="Token uit publish.buffer.com/settings/api" />
            <p className="text-xs text-muted-foreground mt-1">Na het invullen: eerst opslaan, dan kanalen ophalen.</p>
          </div>

          <Button variant="outline" onClick={handleFetchChannels} disabled={loadingChannels}>
            {loadingChannels ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Kanalen ophalen uit Buffer
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const options = channels.filter((ch) => ch.service === platform.bufferService);
              const current = form.buffer_profiles[platform.key] || "";
              return (
                <div key={platform.key}>
                  <Label className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {platform.label}</Label>
                  {options.length > 0 ? (
                    <Select
                      value={current}
                      onValueChange={(v) => setForm((p) => ({ ...p, buffer_profiles: { ...p.buffer_profiles, [platform.key]: v } }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Kies kanaal..." /></SelectTrigger>
                      <SelectContent>
                        {options.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            {ch.name}{ch.isDisconnected ? " (disconnected)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={current}
                      onChange={(e) => setForm((p) => ({ ...p, buffer_profiles: { ...p.buffer_profiles, [platform.key]: e.target.value } }))}
                      placeholder="Channel-ID"
                    />
                  )}
                  {current && <Badge variant="outline" className="mt-1 text-[10px] font-normal">ingesteld</Badge>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Zonder eigen token en kanaal wordt er voor deze klant níét gepubliceerd — er is bewust geen terugval op een ander Buffer-account.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Beeld (override)</CardTitle>
          <CardDescription>Leeg laten = de globale beeld-instellingen gebruiken. Hier alleen afwijkingen voor deze klant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Provider</Label>
              <Select
                value={form.img_provider}
                onValueChange={(v) => setForm((p) => ({ ...p, img_provider: v, img_model: USE_GLOBAL }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={USE_GLOBAL}>Globale default</SelectItem>
                  {IMAGE_PROVIDERS.map((pr) => <SelectItem key={pr.value} value={pr.value}>{pr.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model</Label>
              <Select
                value={form.img_model}
                onValueChange={(v) => setForm((p) => ({ ...p, img_model: v }))}
                disabled={form.img_provider === USE_GLOBAL}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={USE_GLOBAL}>Globale default</SelectItem>
                  {imgModels.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kwaliteit</Label>
              <Select
                value={form.img_quality}
                onValueChange={(v) => setForm((p) => ({ ...p, img_quality: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={USE_GLOBAL}>Globale default</SelectItem>
                  {IMAGE_QUALITIES.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Merk-stijlprompt</Label>
            <Textarea rows={2} value={form.img_style_prompt} onChange={(e) => setForm((p) => ({ ...p, img_style_prompt: e.target.value }))} placeholder="Overschrijft de globale stijl-prompt voor deze klant" />
          </div>
          <div>
            <Label>Merkkleuren (hex, kommagescheiden)</Label>
            <Input value={form.brand_colors_text} onChange={(e) => setForm((p) => ({ ...p, brand_colors_text: e.target.value }))} placeholder="#477a92, #e8e1d4" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Negative prompt</Label>
              <Textarea rows={2} value={form.img_negative_prompt} onChange={(e) => setForm((p) => ({ ...p, img_negative_prompt: e.target.value }))} placeholder="Leeg = globale default" />
            </div>
            <div>
              <Label>Seed (optioneel, vaste look)</Label>
              <Input type="number" value={form.img_seed} onChange={(e) => setForm((p) => ({ ...p, img_seed: e.target.value }))} placeholder="bv. 42" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
