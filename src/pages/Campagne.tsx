import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Linkedin, Twitter, Instagram, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { type Client, type Topic, defaultClients, generateId } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

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

// Mock topic generator (will be replaced by n8n webhook)
function generateMockTopics(theme: string, client: Client): Topic[] {
  const templates = [
    { hook: `Waarom ${theme} de toekomst is van ${client.doelgroep.split(",")[0]}`, platform: "linkedin" as const },
    { hook: `3 fouten die iedereen maakt met ${theme}`, platform: "linkedin" as const },
    { hook: `${theme}: wat niemand je vertelt (maar zou moeten)`, platform: "linkedin" as const },
    { hook: `De #1 ${theme} strategie die wij gebruiken bij ${client.name}`, platform: "x" as const },
    { hook: `Hot take: ${theme} is overrated. Dit is beter →`, platform: "x" as const },
    { hook: `${theme} in 60 seconden uitgelegd 🧵`, platform: "x" as const },
    { hook: `Van 0 naar expert in ${theme} – onze journey 🎬`, platform: "instagram" as const },
    { hook: `5 ${theme} tips die je vandaag kunt toepassen ✨`, platform: "instagram" as const },
    { hook: `Behind the scenes: hoe wij ${theme} aanpakken bij ${client.name}`, platform: "instagram" as const },
    { hook: `${theme} mythes ontkracht – deel 1 💡`, platform: "linkedin" as const },
  ];
  return templates.map((t) => ({ ...t, id: generateId(), status: "pending" }));
}

export default function Campagne() {
  const [clients] = useState<Client[]>(defaultClients);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [theme, setTheme] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleGenerate = async () => {
    if (!selectedClient || !theme.trim()) return;
    setGenerating(true);
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1500));
    const newTopics = generateMockTopics(theme, selectedClient);
    setTopics(newTopics);
    setGenerating(false);
    toast({ title: "Topics gegenereerd!", description: `${newTopics.length} topics voor "${theme}"` });
  };

  const toggleTopic = (id: string, status: "approved" | "rejected") => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === status ? "pending" : status } : t))
    );
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
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een klant..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Thema / onderwerp</Label>
              <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Bijv. AI in marketing, duurzaamheid..."
              />
            </div>
          </div>

          {selectedClient && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">🎯 {selectedClient.doelgroep}</Badge>
              <Badge variant="secondary">🗣️ {selectedClient.toneOfVoice}</Badge>
              <Badge variant="outline">{selectedClient.hashtags}</Badge>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!selectedClient || !theme.trim() || generating}
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

      {topics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Gegenereerde topics ({approvedCount} geselecteerd)
            </h2>
            <Button
              disabled={approvedCount === 0}
              className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
            >
              Genereer content ({approvedCount})
            </Button>
          </div>

          <div className="grid gap-3">
            {topics.map((topic) => {
              const Icon = platformIcons[topic.platform];
              return (
                <Card
                  key={topic.id}
                  className={`transition-all ${
                    topic.status === "approved"
                      ? "ring-2 ring-primary/40 bg-accent/30"
                      : topic.status === "rejected"
                        ? "opacity-50"
                        : ""
                  }`}
                >
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <Checkbox
                      checked={topic.status === "approved"}
                      onCheckedChange={() => toggleTopic(topic.id, "approved")}
                    />
                    <Badge className={platformColors[topic.platform]} variant="secondary">
                      <Icon className="h-3 w-3 mr-1" />
                      {topic.platform === "x" ? "X" : topic.platform.charAt(0).toUpperCase() + topic.platform.slice(1)}
                    </Badge>
                    <p className="flex-1 text-sm text-foreground">{topic.hook}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleTopic(topic.id, "approved")}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${topic.status === "approved" ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleTopic(topic.id, "rejected")}
                      >
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
