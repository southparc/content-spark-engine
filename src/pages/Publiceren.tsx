import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Linkedin, Twitter, Instagram, FileText, CheckCircle2, Clock } from "lucide-react";
import { useSettings, useCampaigns, useTopics, useUpdateTopic, type MmTopic } from "@/hooks/use-marketing-data";
import { useClients } from "@/hooks/use-marketing-data";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

async function publishViaN8n(
  webhookUrl: string,
  topic: MmTopic,
  clientName: string
): Promise<void> {
  const { error } = await supabase.functions.invoke("webhook-proxy", {
    body: {
      webhook_url: webhookUrl,
      payload: {
        topic_id: topic.id,
        hook: topic.hook,
        platform: topic.platform,
        content: topic.generated_content,
        media_url: topic.media_url,
        client_name: clientName,
      },
    },
  });
  if (error) throw error;
}

export default function Publiceren() {
  const { data: clients } = useClients();
  const { data: campaigns } = useCampaigns();
  const { data: settings } = useSettings();
  const updateTopic = useUpdateTopic();
  const { toast } = useToast();

  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const { data: topics, refetch: refetchTopics } = useTopics(selectedCampaignId || undefined);
  const [publishing, setPublishing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const readyTopics = topics?.filter((t) => t.generated_content && !t.posted_at) || [];
  const postedTopics = topics?.filter((t) => t.posted_at) || [];
  const webhookUrl = settings?.webhook_post;
  const hasWebhook = !!webhookUrl?.trim();

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId);
  const clientName = clients?.find((c) => c.id === selectedCampaign?.client_id)?.name || "";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === readyTopics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readyTopics.map((t) => t.id)));
    }
  };

  const handlePublish = async () => {
    if (!hasWebhook || selectedIds.size === 0) return;
    setPublishing(true);
    let success = 0;
    const toPublish = readyTopics.filter((t) => selectedIds.has(t.id));

    for (const topic of toPublish) {
      try {
        await publishViaN8n(webhookUrl!, topic, clientName);
        await updateTopic.mutateAsync({ id: topic.id, posted_at: new Date().toISOString() });
        success++;
      } catch (err) {
        console.error(`Publicatie mislukt voor topic ${topic.id}:`, err);
      }
    }

    await refetchTopics();
    setSelectedIds(new Set());
    setPublishing(false);
    toast({
      title: `${success}/${toPublish.length} gepubliceerd`,
      description: success === toPublish.length ? "Alle posts zijn verstuurd!" : "Sommige posts zijn mislukt.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Publiceren</h1>
        <p className="text-muted-foreground">Publiceer goedgekeurde content naar social media</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campagne selecteren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCampaignId} onValueChange={(v) => { setSelectedCampaignId(v); setSelectedIds(new Set()); }}>
            <SelectTrigger>
              <SelectValue placeholder="Kies een campagne..." />
            </SelectTrigger>
            <SelectContent>
              {campaigns?.map((c) => {
                const client = clients?.find((cl) => cl.id === c.client_id);
                return (
                  <SelectItem key={c.id} value={c.id}>
                    {client?.name} — {c.theme}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selectedCampaignId && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>📝 {readyTopics.length} klaar om te publiceren</span>
              <span>✅ {postedTopics.length} gepubliceerd</span>
            </div>
          )}

          {!hasWebhook && (
            <p className="text-xs text-muted-foreground">⚠️ Stel eerst een webhook in bij Instellingen → "Webhook: Posten"</p>
          )}
        </CardContent>
      </Card>

      {readyTopics.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Klaar om te publiceren</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === readyTopics.length ? "Deselecteer alles" : "Selecteer alles"}
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={selectedIds.size === 0 || publishing || !hasWebhook}
                className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
              >
                {publishing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publiceren...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Publiceer ({selectedIds.size})</>
                )}
              </Button>
            </div>
          </div>

          {readyTopics.map((topic) => {
            const Icon = platformIcons[topic.platform] || FileText;
            return (
              <Card key={topic.id} className={`transition-all ${selectedIds.has(topic.id) ? "ring-2 ring-primary/40 bg-accent/30" : ""}`}>
                <CardContent className="flex items-start gap-4 py-3 px-4">
                  <Checkbox checked={selectedIds.has(topic.id)} onCheckedChange={() => toggleSelect(topic.id)} className="mt-1" />
                  <Badge variant="secondary" className="mt-1">
                    <Icon className="h-3 w-3 mr-1" />
                    {topic.platform}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{topic.hook}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{topic.generated_content}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {postedTopics.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Gepubliceerd
          </h2>
          {postedTopics.map((topic) => {
            const Icon = platformIcons[topic.platform] || FileText;
            return (
              <Card key={topic.id} className="opacity-70">
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <Badge variant="secondary">
                    <Icon className="h-3 w-3 mr-1" />
                    {topic.platform}
                  </Badge>
                  <p className="flex-1 text-sm text-foreground">{topic.hook}</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(topic.posted_at!).toLocaleDateString("nl-NL")}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
