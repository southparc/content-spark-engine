import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Lightbulb, ExternalLink, Linkedin, Twitter, Instagram, Search, Plus, FolderPlus } from "lucide-react";
import { useClients, useSettings, useCampaigns, useCreateCampaign, useCreateTopics } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import { invokeN8nWebhook, getErrorMessage } from "@/lib/n8n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TrendingTopic {
  topic: string;
  platform: string;
  relevance?: string;
  source?: string;
}

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

function parseTrendingResponse(value: unknown): TrendingTopic[] {
  if (!value) return [];

  const tryParse = (v: unknown): TrendingTopic[] => {
    if (Array.isArray(v)) {
      return v
        .map((item): TrendingTopic | null => {
          if (typeof item === "string") return { topic: item, platform: "linkedin" };
          if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            const topic = (obj.topic || obj.title || obj.text || obj.hook) as string;
            if (!topic) return null;
            return {
              topic,
              platform: ((obj.platform as string) || "linkedin").toLowerCase(),
              relevance: (obj.relevance || obj.score || obj.reason) as string | undefined,
              source: (obj.source || obj.url) as string | undefined,
            };
          }
          return null;
        })
        .filter((t): t is TrendingTopic => t != null);
    }
    return [];
  };

  if (Array.isArray(value)) return tryParse(value);
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    for (const key of ["trends", "topics", "items", "data", "result", "output"]) {
      if (Array.isArray(obj[key])) return tryParse(obj[key]);
    }
  }
  return [];
}

export default function CompetitorMonitoring() {
  const { data: clients } = useClients();
  const { data: settings } = useSettings();
  const { data: campaigns } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const createTopics = useCreateTopics();
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [targetCampaignId, setTargetCampaignId] = useState("new");
  const [converting, setConverting] = useState(false);

  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const clientCampaigns = campaigns?.filter((c) => c.client_id === selectedClientId) || [];
  const webhookUrl = settings?.webhook_trending_topics;
  const hasWebhook = !!webhookUrl?.trim();

  // Zet trends om naar voorraad-hooks onder een campagne; de scheduler werkt ze
  // op de eerstvolgende tijdslots automatisch uit tot complete posts.
  const handleConvert = async (toConvert: TrendingTopic[]) => {
    if (!selectedClient) {
      toast({ title: "Kies eerst een klant", description: "Trends worden voorraad binnen een campagne van die klant.", variant: "destructive" });
      return;
    }
    if (toConvert.length === 0) return;
    setConverting(true);
    try {
      let campaignId = targetCampaignId;
      let campaignTheme = "";
      if (targetCampaignId === "new") {
        const theme = niche.trim() || `Trends ${new Date().toLocaleDateString("nl-NL")}`;
        const campaign = await createCampaign.mutateAsync({ client_id: selectedClient.id, theme });
        campaignId = campaign.id;
        campaignTheme = campaign.theme;
        setTargetCampaignId(campaign.id);
      } else {
        campaignTheme = clientCampaigns.find((c) => c.id === targetCampaignId)?.theme || "";
      }
      await createTopics.mutateAsync(
        toConvert.map((t) => ({ campaign_id: campaignId, hook: t.topic, platform: t.platform })),
      );
      setTrends((prev) => prev.filter((t) => !toConvert.includes(t)));
      toast({
        title: `${toConvert.length} trend(s) toegevoegd aan voorraad`,
        description: `Campagne "${campaignTheme}". Bekijk de funnel op Pipeline.`,
      });
    } catch (err) {
      toast({ title: "Omzetten mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setConverting(false);
  };

  const handleFetchTrends = async () => {
    if (!hasWebhook) return;
    setLoading(true);
    try {
      const data = await invokeN8nWebhook({
        webhookUrl: webhookUrl!,
        payload: {
          client_name: selectedClient?.name || "",
          doelgroep: selectedClient?.doelgroep || "",
          branding: selectedClient?.branding || "",
          niche: niche || selectedClient?.doelgroep || "marketing",
          platforms: ["linkedin", "x", "instagram"],
        },
      });
      const parsed = parseTrendingResponse(data);
      if (parsed.length === 0) {
        toast({ title: "Geen trends gevonden", description: "n8n gaf geen bruikbare trending topics terug.", variant: "destructive" });
      } else {
        setTrends(parsed);
        toast({ title: `${parsed.length} trending topics gevonden!` });
      }
    } catch (err) {
      toast({ title: "Fout bij ophalen", description: getErrorMessage(err), variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Competitor & Trend Monitoring</h1>
        <p className="text-muted-foreground">Ontdek trending topics in jouw niche als inspiratie voor content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Trends ophalen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Klant (optioneel)</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een klant..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen klant</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Niche / zoekterm</Label>
              <Input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Bijv. AI marketing, duurzaamheid, SaaS..."
              />
            </div>
          </div>

          <Button
            onClick={handleFetchTrends}
            disabled={loading || !hasWebhook}
            className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Trends ophalen...</>
            ) : (
              <><TrendingUp className="h-4 w-4 mr-2" /> Haal trending topics op</>
            )}
          </Button>

          {!hasWebhook && (
            <p className="text-xs text-muted-foreground">
              ⚠️ Stel eerst een webhook in bij Instellingen → "Webhook: Trending topics"
            </p>
          )}
        </CardContent>
      </Card>

      {trends.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {trends.length} trending topics gevonden
            </h2>
          </div>

          <Card className="bg-accent/30">
            <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3 py-3 px-4">
              <div className="flex-1">
                <Label className="text-xs">Omzetten naar campagne</Label>
                <Select value={targetCampaignId} onValueChange={setTargetCampaignId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">➕ Nieuwe campagne{niche.trim() ? ` ("${niche.trim()}")` : ""}</SelectItem>
                    {clientCampaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.theme} (voorraad aanvullen)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => handleConvert(trends)}
                disabled={converting || !selectedClient}
                className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
              >
                {converting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FolderPlus className="h-4 w-4 mr-2" />}
                Alle {trends.length} naar campagne
              </Button>
            </CardContent>
          </Card>
          {!selectedClient && (
            <p className="text-xs text-muted-foreground">⚠️ Kies bovenaan een klant om trends om te zetten naar een campagne.</p>
          )}

          <div className="grid gap-3">
            {trends.map((trend, i) => {
              const Icon = platformIcons[trend.platform] || TrendingUp;
              return (
                <Card key={i}>
                  <CardContent className="flex items-start gap-4 py-3 px-4">
                    <Badge variant="secondary" className="mt-0.5 shrink-0">
                      <Icon className="h-3 w-3 mr-1" />
                      {trend.platform}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{trend.topic}</p>
                      {trend.relevance && (
                        <p className="text-xs text-muted-foreground mt-1">💡 {trend.relevance}</p>
                      )}
                    </div>
                    {trend.source && (
                      <a href={trend.source} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary mt-0.5">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={converting || !selectedClient}
                      onClick={() => handleConvert([trend])}
                      title="Deze trend naar de voorraad van de campagne"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
