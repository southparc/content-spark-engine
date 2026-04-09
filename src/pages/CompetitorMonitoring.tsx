import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Lightbulb, ExternalLink, Linkedin, Twitter, Instagram, Search } from "lucide-react";
import { useClients, useSettings } from "@/hooks/use-marketing-data";
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
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<TrendingTopic[]>([]);

  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const webhookUrl = settings?.webhook_trending_topics;
  const hasWebhook = !!webhookUrl?.trim();

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
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {trends.length} trending topics gevonden
          </h2>
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
                      <a href={trend.source} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
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
