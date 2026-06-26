import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Loader2, Plus, Lightbulb, Linkedin, Twitter, Instagram, FileText, ExternalLink, Check, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useClients, useCampaigns, useCreateCampaign, useCreateTopics, useTopics, useSettings, useUpdateTopic, useDeleteTopic, type MmClient,
} from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";
import { invokeN8nWebhook, parseTopicsResponse, getErrorMessage } from "@/lib/n8n";

const platformIcons: Record<string, any> = { linkedin: Linkedin, x: Twitter, instagram: Instagram };

interface Trend { topic: string; platform: string; relevance?: string; source?: string }

function parseTrends(value: unknown): Trend[] {
  const arr = (value && typeof value === "object" && Array.isArray((value as any).trends))
    ? (value as any).trends
    : Array.isArray(value) ? value : [];
  return (arr as any[])
    .map((t) => ({
      topic: String(t.topic || t.title || t.hook || "").trim(),
      platform: (String(t.platform || "linkedin").toLowerCase() === "twitter" ? "x" : String(t.platform || "linkedin").toLowerCase()),
      relevance: t.relevance || t.reason,
      source: t.source || t.url,
    }))
    .filter((t) => t.topic);
}

export default function Maken() {
  const { data: clients } = useClients();
  const { data: campaigns } = useCampaigns();
  const { data: settings } = useSettings();
  const createCampaign = useCreateCampaign();
  const createTopics = useCreateTopics();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const { toast } = useToast();

  const { activeClientId } = useActiveClient();
  const clientId = activeClientId === ALL_CLIENTS ? "" : activeClientId;
  const [campaignId, setCampaignId] = useState("new");
  const [theme, setTheme] = useState("");
  const [keyword, setKeyword] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trends, setTrends] = useState<Trend[]>([]);

  // Wisselt de actieve klant: campagnekeuze en trends resetten
  useEffect(() => { setCampaignId("new"); setTrends([]); }, [clientId]);

  const client = clients?.find((c) => c.id === clientId) as MmClient | undefined;
  const clientCampaigns = campaigns?.filter((c) => c.client_id === clientId) || [];
  const targetCampaign = campaigns?.find((c) => c.id === campaignId);
  const effectiveTheme = campaignId !== "new" && targetCampaign ? targetCampaign.theme : theme;

  const { data: voorraadTopics } = useTopics(campaignId !== "new" ? campaignId : undefined);
  const voorraad = (voorraadTopics || []).filter((t) => !t.generated_content);

  // Zorgt dat er een campagne is om voorraad onder te bewaren
  const ensureCampaign = async (): Promise<string> => {
    if (campaignId !== "new" && targetCampaign) return targetCampaign.id;
    const c = await createCampaign.mutateAsync({ client_id: clientId, theme: theme.trim() || "Nieuwe campagne" });
    setCampaignId(c.id);
    return c.id;
  };

  const handleGenerate = async () => {
    if (!client || !effectiveTheme.trim()) {
      toast({ title: "Kies een klant en thema", variant: "destructive" });
      return;
    }
    const webhook = settings?.webhook_generate_topics;
    if (!webhook?.trim()) { toast({ title: "Geen topics-webhook ingesteld", variant: "destructive" }); return; }
    setGenLoading(true);
    try {
      const cid = await ensureCampaign();
      const data = await invokeN8nWebhook({
        webhookUrl: webhook,
        payload: {
          client_name: client.name, doelgroep: client.doelgroep, tone_of_voice: client.tone_of_voice,
          hashtags: client.hashtags, branding: client.branding, theme: effectiveTheme,
          keyword: keyword || undefined, platforms: ["linkedin", "x", "instagram"],
        },
      });
      const raw = parseTopicsResponse(data);
      await createTopics.mutateAsync(raw.map((t) => ({ campaign_id: cid, hook: t.hook, platform: t.platform })));
      toast({ title: `${raw.length} onderwerpen toegevoegd aan voorraad` });
    } catch (err) {
      toast({ title: "Genereren mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setGenLoading(false);
  };

  const handleTrends = async () => {
    if (!client) { toast({ title: "Kies eerst een klant", variant: "destructive" }); return; }
    const webhook = settings?.webhook_trending_topics;
    if (!webhook?.trim()) { toast({ title: "Geen trends-webhook ingesteld", variant: "destructive" }); return; }
    setTrendLoading(true);
    try {
      const data = await invokeN8nWebhook({
        webhookUrl: webhook,
        payload: { client_name: client.name, doelgroep: client.doelgroep, branding: client.branding, niche: effectiveTheme || client.doelgroep, platforms: ["linkedin", "x", "instagram"] },
      });
      const parsed = parseTrends(data);
      setTrends(parsed);
      toast({ title: parsed.length ? `${parsed.length} trends gevonden` : "Geen trends gevonden", variant: parsed.length ? "default" : "destructive" });
    } catch (err) {
      toast({ title: "Trends ophalen mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setTrendLoading(false);
  };

  const addTrend = async (tr: Trend) => {
    if (!client) return;
    try {
      const cid = await ensureCampaign();
      await createTopics.mutateAsync([{ campaign_id: cid, hook: tr.topic, platform: tr.platform }]);
      setTrends((prev) => prev.filter((x) => x !== tr));
      toast({ title: "Toegevoegd aan voorraad" });
    } catch (err) {
      toast({ title: "Mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Maken</h1>
        <p className="text-muted-foreground">Bedenk en verzamel onderwerpen. Wat hier in de voorraad komt, werkt de scheduler vanzelf uit tot posts.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Onderwerpen genereren</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!clientId && (
            <p className="text-sm text-muted-foreground">Kies eerst een klant rechtsboven om onderwerpen te maken.</p>
          )}
          <div>
            <Label>Campagne</Label>
            <Select value={campaignId} onValueChange={setCampaignId} disabled={!clientId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">➕ Nieuwe campagne</SelectItem>
                {clientCampaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.theme}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {campaignId === "new" && (
            <div>
              <Label>Thema</Label>
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Waar moet deze klant over praten?" />
            </div>
          )}
          <div>
            <Label>Keyword / invalshoek (optioneel)</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Optionele invalshoek voor deze ronde" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={!clientId || !effectiveTheme.trim() || genLoading} className="gradient-primary border-0 text-primary-foreground hover:opacity-90">
              {genLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Genereer onderwerpen
            </Button>
            <Button variant="outline" onClick={handleTrends} disabled={!clientId || trendLoading}>
              {trendLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />} Haal trends op
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Voorraad */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Voorraad</h2>
            <Badge variant="secondary" className="text-xs">{voorraad.length}</Badge>
          </div>
          {campaignId === "new" && <Card className="border-dashed"><CardContent className="py-6 text-center text-xs text-muted-foreground">Kies of maak een campagne om de voorraad te zien.</CardContent></Card>}
          {campaignId !== "new" && voorraad.length === 0 && <Card className="border-dashed"><CardContent className="py-6 text-center text-xs text-muted-foreground">Nog geen onderwerpen. Genereer er hierboven.</CardContent></Card>}
          {voorraad.map((t) => {
            const Icon = platformIcons[t.platform] || FileText;
            const approved = t.client_approved === true;
            return (
              <Card key={t.id} className={approved ? "ring-1 ring-primary/30" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Icon className="h-3 w-3" /> {t.platform}
                    {approved && <span className="ml-auto flex items-center gap-1 text-primary"><Check className="h-3 w-3" /> goedgekeurd</span>}
                  </div>
                  <p className="text-xs text-foreground mt-1">{t.hook}</p>
                  <div className="flex gap-1 mt-2">
                    <button
                      title={approved ? "Goedkeuring intrekken" : "Goedkeuren"}
                      onClick={() => updateTopic.mutate({ id: t.id, client_approved: approved ? (null as any) : true })}
                      className={`h-7 flex-1 rounded-md border border-border flex items-center justify-center transition-colors text-xs ${approved ? "bg-primary/10 text-primary" : "hover:bg-primary/10 text-muted-foreground"}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Verwijderen"
                      onClick={() => deleteTopic.mutate(t.id)}
                      className="h-7 flex-1 rounded-md border border-border flex items-center justify-center transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trends */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Actuele trends</h2>
            <Badge variant="secondary" className="text-xs">{trends.length}</Badge>
          </div>
          {trends.length === 0 && <Card className="border-dashed"><CardContent className="py-6 text-center text-xs text-muted-foreground">Haal trends op voor verse invalshoeken uit het nieuws.</CardContent></Card>}
          {trends.map((tr, i) => {
            const Icon = platformIcons[tr.platform] || FileText;
            return (
              <Card key={i}>
                <CardContent className="p-3 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" /> {tr.platform}</span>
                    <p className="text-xs text-foreground mt-1">{tr.topic}</p>
                    {tr.relevance && <p className="text-[11px] text-muted-foreground mt-1">{tr.relevance}</p>}
                    {tr.source && <a href={tr.source} target="_blank" rel="noopener" className="text-[11px] text-primary inline-flex items-center gap-1 mt-1">bron <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => addTrend(tr)} title="Naar voorraad"><Plus className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
