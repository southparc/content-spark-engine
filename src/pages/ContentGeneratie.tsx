import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Linkedin, Twitter, Instagram, Send, Eye, CheckCircle2 } from "lucide-react";
import { useSettings, useCampaigns, useTopics, useUpdateTopic, type MmTopic } from "@/hooks/use-marketing-data";
import { useClients } from "@/hooks/use-marketing-data";

import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

async function fetchContentFromN8n(
  webhookUrl: string,
  topic: MmTopic,
  clientName: string
): Promise<string> {
  const { data: result, error } = await supabase.functions.invoke("webhook-proxy", {
    body: {
      webhook_url: webhookUrl,
      payload: {
        topic_id: topic.id,
        hook: topic.hook,
        platform: topic.platform,
        client_name: clientName,
      },
    },
  });

  if (error) throw error;
  return result.content || result.text || result.generated_content || JSON.stringify(result);
}

export default function ContentGeneratie() {
  const { data: clients } = useClients();
  const { data: campaigns } = useCampaigns();
  const { data: settings } = useSettings();
  const updateTopic = useUpdateTopic();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const [selectedCampaignId, setSelectedCampaignId] = useState(searchParams.get("campaign") || "");
  const { data: topics, refetch: refetchTopics } = useTopics(selectedCampaignId || undefined);
  const [generating, setGenerating] = useState(false);
  const [previewTopic, setPreviewTopic] = useState<MmTopic | null>(null);

  const approvedTopics = topics?.filter((t) => t.status === "approved") || [];
  const withContent = topics?.filter((t) => t.generated_content) || [];
  const webhookUrl = settings?.webhook_generate_content;
  const hasWebhook = !!webhookUrl?.trim();

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId);
  const clientName = clients?.find((c) => c.id === selectedCampaign?.client_id)?.name || "";

  const handleGenerateContent = async () => {
    if (!hasWebhook) {
      toast({ title: "Geen webhook", description: "Stel een 'Content genereren' webhook in bij Instellingen.", variant: "destructive" });
      return;
    }
    if (approvedTopics.length === 0) {
      toast({ title: "Geen goedgekeurde topics", description: "Keur eerst topics goed op de Campagne pagina.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    let success = 0;
    for (const topic of approvedTopics) {
      if (topic.generated_content) { success++; continue; }
      try {
        const content = await fetchContentFromN8n(webhookUrl!, topic, clientName);
        await updateTopic.mutateAsync({ id: topic.id, generated_content: content });
        success++;
      } catch (err) {
        console.error(`Content generatie mislukt voor topic ${topic.id}:`, err);
      }
    }
    await refetchTopics();
    setGenerating(false);
    toast({
      title: `${success}/${approvedTopics.length} posts gegenereerd`,
      description: success === approvedTopics.length ? "Alle content is klaar!" : "Sommige posts zijn mislukt. Probeer opnieuw.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Generatie</h1>
        <p className="text-muted-foreground">Genereer post-teksten voor goedgekeurde topics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campagne selecteren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
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
              <span>✅ {approvedTopics.length} goedgekeurd</span>
              <span>📝 {withContent.length} met content</span>
            </div>
          )}

          <Button
            onClick={handleGenerateContent}
            disabled={!selectedCampaignId || approvedTopics.length === 0 || generating || !hasWebhook}
            className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Genereren...</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Genereer content ({approvedTopics.filter(t => !t.generated_content).length})</>
            )}
          </Button>

          {!hasWebhook && (
            <p className="text-xs text-muted-foreground">⚠️ Stel eerst een webhook in bij Instellingen → "Webhook: Content genereren"</p>
          )}
        </CardContent>
      </Card>

      {withContent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Gegenereerde content</h2>
          {withContent.map((topic) => {
            const Icon = platformIcons[topic.platform] || FileText;
            return (
              <Card key={topic.id}>
                <CardContent className="flex items-start gap-4 py-4 px-4">
                  <Badge variant="secondary" className="mt-1">
                    <Icon className="h-3 w-3 mr-1" />
                    {topic.platform}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground mb-1">{topic.hook}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{topic.generated_content}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTopic(topic)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewTopic} onOpenChange={() => setPreviewTopic(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTopic && (() => { const Icon = platformIcons[previewTopic.platform]; return Icon ? <Icon className="h-4 w-4" /> : null; })()}
              {previewTopic?.hook}
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {previewTopic?.generated_content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
