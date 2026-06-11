import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Linkedin, Twitter, Instagram, Loader2, CheckCircle2, XCircle, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClients, useCampaigns, useSettings, useCreateCampaign, useCreateTopics, useUpdateTopic, type MmClient, type MmTopic } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, invokeN8nWebhook, parseTopicsResponse } from "@/lib/n8n";

const platformIcons = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

const platformColors: Record<string, string> = {
  linkedin: "bg-accent text-accent-foreground",
  x: "bg-secondary text-secondary-foreground",
  instagram: "bg-accent text-accent-foreground",
};

function generateMockTopics(theme: string, client: MmClient) {
  const audience = client.doelgroep.split(",")[0] || client.doelgroep;
  return [
    { hook: `Waarom ${theme} de toekomst is van ${audience}`, platform: "linkedin" },
    { hook: `3 fouten die iedereen maakt met ${theme}`, platform: "linkedin" },
    { hook: `${theme}: wat niemand je vertelt (maar zou moeten)`, platform: "linkedin" },
    { hook: `De #1 ${theme} strategie die wij gebruiken bij ${client.name}`, platform: "x" },
    { hook: `Hot take: ${theme} is overrated. Dit is beter →`, platform: "x" },
    { hook: `${theme} in 60 seconden uitgelegd 🧵`, platform: "x" },
    { hook: `Van 0 naar expert in ${theme} – onze journey 🎬`, platform: "instagram" },
    { hook: `5 ${theme} tips die je vandaag kunt toepassen ✨`, platform: "instagram" },
    { hook: `Behind the scenes: hoe wij ${theme} aanpakken bij ${client.name}`, platform: "instagram" },
    { hook: `${theme} mythes ontkracht – deel 1 💡`, platform: "linkedin" },
  ];
}

async function fetchTopicsFromN8n(
  webhookUrl: string,
  client: MmClient,
  theme: string
): Promise<{ hook: string; platform: string }[]> {
  const data = await invokeN8nWebhook({
    webhookUrl,
    payload: {
      client_name: client.name,
      doelgroep: client.doelgroep,
      tone_of_voice: client.tone_of_voice,
      hashtags: client.hashtags,
      branding: client.branding,
      theme,
      platforms: ["linkedin", "x", "instagram"],
    },
  });

  return parseTopicsResponse(data);
}

export default function Campagne() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: settings } = useSettings();
  const createCampaign = useCreateCampaign();
  const createTopics = useCreateTopics();
  const updateTopic = useUpdateTopic();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [targetCampaignId, setTargetCampaignId] = useState("new");
  const [theme, setTheme] = useState("");
  const [topics, setTopics] = useState<MmTopic[]>([]);
  const [generating, setGenerating] = useState(false);
  const [usedWebhook, setUsedWebhook] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const clientCampaigns = campaigns?.filter((c) => c.client_id === selectedClientId) || [];
  const targetCampaign = campaigns?.find((c) => c.id === targetCampaignId);
  const webhookUrl = settings?.webhook_generate_topics;
  const hasWebhook = !!webhookUrl?.trim();

  const effectiveTheme = targetCampaignId !== "new" && targetCampaign ? targetCampaign.theme : theme;

  const handleGenerate = async () => {
    if (!selectedClient || !effectiveTheme.trim()) return;
    setGenerating(true);
    try {
      // 1. Bestaande campagne aanvullen (hook-voorraad voor de scheduler) of nieuwe aanmaken
      const campaign =
        targetCampaignId !== "new" && targetCampaign
          ? targetCampaign
          : await createCampaign.mutateAsync({ client_id: selectedClient.id, theme });

      // 2. Generate topics via n8n webhook or fallback to mock
      let rawTopics: { hook: string; platform: string }[];
      let fromWebhook = false;

      if (hasWebhook) {
        try {
          rawTopics = await fetchTopicsFromN8n(webhookUrl!, selectedClient, effectiveTheme);
          fromWebhook = true;
        } catch (webhookErr) {
          console.error("n8n webhook failed, falling back to mock:", webhookErr);
          toast({
            title: "n8n webhook mislukt",
            description: `Fallback naar voorbeeldtopics. ${getErrorMessage(webhookErr)}`,
            variant: "destructive",
          });
          rawTopics = generateMockTopics(theme, selectedClient);
        }
      } else {
        rawTopics = generateMockTopics(theme, selectedClient);
      }

      // 3. Save to DB
      const savedTopics = await createTopics.mutateAsync(
        rawTopics.map((t) => ({ ...t, campaign_id: campaign.id }))
      );
      setTopics(savedTopics);
      setUsedWebhook(fromWebhook);
      toast({
        title: fromWebhook ? "AI-topics gegenereerd! 🤖" : "Voorbeeldtopics gegenereerd",
        description: fromWebhook
          ? `${savedTopics.length} topics via n8n ontvangen voor "${theme}"`
          : `${savedTopics.length} voorbeeldtopics voor "${theme}". Stel een n8n webhook in voor AI-topics.`,
      });
    } catch (err) {
      toast({ title: "Fout", description: "Kon topics niet genereren. Zijn de tabellen aangemaakt?", variant: "destructive" });
    }
    setGenerating(false);
  };

  const toggleTopic = (id: string, newStatus: "approved" | "rejected") => {
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;
    const status = topic.status === newStatus ? "pending" : newStatus;
    updateTopic.mutate({ id, status });
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const approvedCount = topics.filter((t) => t.status === "approved").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nieuwe Campagne</h1>
        <p className="text-muted-foreground">Genereer topics en content voor je klant</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campagne instellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Klant selecteren</Label>
              <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setTargetCampaignId("new"); }}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingClients ? "Laden..." : "Kies een klant..."} />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campagne</Label>
              <Select value={targetCampaignId} onValueChange={setTargetCampaignId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">➕ Nieuwe campagne</SelectItem>
                  {clientCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.theme} (voorraad aanvullen)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {targetCampaignId === "new" && (
            <div>
              <Label>Thema / onderwerp</Label>
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Bijv. AI in marketing, duurzaamheid..." />
            </div>
          )}

          {selectedClient && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">🎯 {selectedClient.doelgroep}</Badge>
              <Badge variant="secondary">🗣️ {selectedClient.tone_of_voice}</Badge>
              <Badge variant="outline">{selectedClient.hashtags}</Badge>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            {hasWebhook ? (
              <span className="flex items-center gap-1 text-primary"><Wifi className="h-3 w-3" /> n8n webhook actief</span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground"><WifiOff className="h-3 w-3" /> Geen webhook — voorbeeldtopics worden gebruikt</span>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!selectedClient || !effectiveTheme.trim() || generating}
            className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Genereren...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Genereer topics</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Bestaande campagnes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bestaande campagnes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCampaigns ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : !campaigns?.length ? (
            <p className="text-sm text-muted-foreground">Nog geen campagnes aangemaakt.</p>
          ) : (
            <div className="divide-y">
              {campaigns.map((c) => {
                const client = clients?.find((cl) => cl.id === c.client_id);
                return (
                  <div key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.theme}</p>
                      <p className="text-xs text-muted-foreground">
                        {client?.name ?? "Onbekende klant"} · {new Date(c.created_at).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {topics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Gegenereerde topics ({approvedCount} geselecteerd)
            </h2>
            <Button
              disabled={approvedCount === 0}
              className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
              onClick={() => {
                const campaignId = topics[0]?.campaign_id;
                if (campaignId) navigate(`/content?campaign=${campaignId}`);
              }}
            >
              Genereer content ({approvedCount})
            </Button>
          </div>
          <div className="grid gap-3">
            {topics.map((topic) => {
              const Icon = platformIcons[topic.platform];
              return (
                <Card key={topic.id} className={`transition-all ${topic.status === "approved" ? "ring-2 ring-primary/40 bg-accent/30" : topic.status === "rejected" ? "opacity-50" : ""}`}>
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <Checkbox checked={topic.status === "approved"} onCheckedChange={() => toggleTopic(topic.id, "approved")} />
                    <Badge className={platformColors[topic.platform]} variant="secondary">
                      <Icon className="h-3 w-3 mr-1" />
                      {topic.platform === "x" ? "X" : topic.platform.charAt(0).toUpperCase() + topic.platform.slice(1)}
                    </Badge>
                    <p className="flex-1 text-sm text-foreground">{topic.hook}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleTopic(topic.id, "approved")}>
                        <CheckCircle2 className={`h-4 w-4 ${topic.status === "approved" ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleTopic(topic.id, "rejected")}>
                        <XCircle className={`h-4 w-4 ${topic.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`} />
                      </Button>
                    </div>
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
