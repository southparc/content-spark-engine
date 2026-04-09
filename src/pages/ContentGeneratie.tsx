import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Linkedin, Twitter, Instagram, Eye, Copy, Sparkles } from "lucide-react";
import { useSettings, useCampaigns, useTopics, useUpdateTopic, useCreateTopics, type MmTopic } from "@/hooks/use-marketing-data";
import { useClients } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, invokeN8nWebhook, parseContentResponse } from "@/lib/n8n";
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

const FORMAT_OPTIONS: { value: string; label: string; platforms: string[] }[] = [
  { value: "post", label: "Post", platforms: ["linkedin", "x", "instagram"] },
  { value: "carousel", label: "Carousel", platforms: ["linkedin", "instagram"] },
  { value: "thread", label: "Thread", platforms: ["x"] },
  { value: "video", label: "Video script", platforms: ["linkedin", "x", "instagram"] },
  { value: "poll", label: "Poll", platforms: ["linkedin", "x"] },
];

async function fetchContentFromN8n(
  webhookUrl: string,
  topic: MmTopic,
  context: {
    clientName: string;
    campaignTheme?: string;
    doelgroep?: string;
    toneOfVoice?: string;
    hashtags?: string;
    branding?: string;
  }
): Promise<string> {
  const data = await invokeN8nWebhook({
    webhookUrl,
    payload: {
      topic_id: topic.id,
      hook: topic.hook,
      platform: topic.platform,
      content_format: topic.content_format || "post",
      client_name: context.clientName,
      campaign_theme: context.campaignTheme,
      doelgroep: context.doelgroep,
      tone_of_voice: context.toneOfVoice,
      hashtags: context.hashtags,
      branding: context.branding,
    },
  });

  return parseContentResponse(data);
}

export default function ContentGeneratie() {
  const { data: clients } = useClients();
  const { data: campaigns } = useCampaigns();
  const { data: settings } = useSettings();
  const updateTopic = useUpdateTopic();
  const createTopics = useCreateTopics();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const [selectedCampaignId, setSelectedCampaignId] = useState(searchParams.get("campaign") || "");
  const { data: topics, refetch: refetchTopics } = useTopics(selectedCampaignId || undefined);
  const [generating, setGenerating] = useState(false);
  const [generatingVariant, setGeneratingVariant] = useState<string | null>(null);
  const [previewTopic, setPreviewTopic] = useState<MmTopic | null>(null);

  const approvedTopics = topics?.filter((t) => t.status === "approved" && !t.variant_of) || [];
  const withContent = topics?.filter((t) => t.generated_content) || [];
  const webhookUrl = settings?.webhook_generate_content;
  const hasWebhook = !!webhookUrl?.trim();

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId);
  const selectedClient = clients?.find((c) => c.id === selectedCampaign?.client_id);
  const clientName = selectedClient?.name || "";

  const getVariants = (topicId: string) =>
    topics?.filter((t) => t.variant_of === topicId) || [];

  const handleGenerateContent = async () => {
    if (!hasWebhook || approvedTopics.length === 0) return;
    setGenerating(true);
    let success = 0;
    const failures: string[] = [];

    for (const topic of approvedTopics) {
      if (topic.generated_content) { success++; continue; }
      try {
        const content = await fetchContentFromN8n(webhookUrl!, topic, {
          clientName,
          campaignTheme: selectedCampaign?.theme,
          doelgroep: selectedClient?.doelgroep,
          toneOfVoice: selectedClient?.tone_of_voice,
          hashtags: selectedClient?.hashtags,
          branding: selectedClient?.branding,
        });
        await updateTopic.mutateAsync({ id: topic.id, generated_content: content });
        success++;
      } catch (err) {
        failures.push(`${topic.hook}: ${getErrorMessage(err)}`);
      }
    }
    await refetchTopics();
    setGenerating(false);
    toast({
      title: `${success}/${approvedTopics.length} posts gegenereerd`,
      description: success === approvedTopics.length ? "Alle content is klaar!" : failures[0],
      variant: success === approvedTopics.length ? "default" : "destructive",
    });
  };

  const handleGenerateVariant = async (originalTopic: MmTopic) => {
    if (!hasWebhook) return;
    setGeneratingVariant(originalTopic.id);
    try {
      // Create a variant topic
      const variantTopics = await createTopics.mutateAsync([{
        campaign_id: originalTopic.campaign_id,
        hook: originalTopic.hook,
        platform: originalTopic.platform,
        // variant_of and content_format will be set via update since createTopics might not support them
      }]);
      const variantId = variantTopics[0]?.id;
      if (!variantId) throw new Error("Variant niet aangemaakt");

      // Update with variant_of link and approved status
      await updateTopic.mutateAsync({
        id: variantId,
        variant_of: originalTopic.id,
        status: "approved",
        content_format: originalTopic.content_format,
      } as any);

      // Generate content for variant with slightly different prompt
      const data = await invokeN8nWebhook({
        webhookUrl: webhookUrl!,
        payload: {
          topic_id: variantId,
          hook: originalTopic.hook,
          platform: originalTopic.platform,
          content_format: originalTopic.content_format || "post",
          client_name: clientName,
          campaign_theme: selectedCampaign?.theme,
          doelgroep: selectedClient?.doelgroep,
          tone_of_voice: selectedClient?.tone_of_voice,
          hashtags: selectedClient?.hashtags,
          branding: selectedClient?.branding,
          is_variant: true,
          original_content: originalTopic.generated_content,
        },
      });
      const content = parseContentResponse(data);
      await updateTopic.mutateAsync({ id: variantId, generated_content: content });
      await refetchTopics();
      toast({ title: "A/B variant gegenereerd!" });
    } catch (err) {
      toast({ title: "Variant generatie mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setGeneratingVariant(null);
  };

  const handleFormatChange = async (topicId: string, format: string) => {
    try {
      await updateTopic.mutateAsync({ id: topicId, content_format: format } as any);
      await refetchTopics();
    } catch {
      toast({ title: "Format niet opgeslagen", variant: "destructive" });
    }
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

      {/* Format selection for approved topics */}
      {approvedTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Post formats instellen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {approvedTopics.map((topic) => {
              const Icon = platformIcons[topic.platform] || FileText;
              const availableFormats = FORMAT_OPTIONS.filter((f) => f.platforms.includes(topic.platform));
              return (
                <div key={topic.id} className="flex items-center gap-3 py-1">
                  <Badge variant="secondary" className="shrink-0">
                    <Icon className="h-3 w-3 mr-1" /> {topic.platform}
                  </Badge>
                  <span className="text-sm text-foreground flex-1 truncate">{topic.hook}</span>
                  <Select
                    value={topic.content_format || "post"}
                    onValueChange={(v) => handleFormatChange(topic.id, v)}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFormats.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {withContent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Gegenereerde content</h2>
          {withContent.filter((t) => !t.variant_of).map((topic) => {
            const Icon = platformIcons[topic.platform] || FileText;
            const variants = getVariants(topic.id);
            return (
              <div key={topic.id} className="space-y-1">
                <Card>
                  <CardContent className="flex items-start gap-4 py-4 px-4">
                    <Badge variant="secondary" className="mt-1">
                      <Icon className="h-3 w-3 mr-1" />
                      {topic.platform}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground">{topic.hook}</p>
                        {topic.content_format && topic.content_format !== "post" && (
                          <Badge variant="outline" className="text-[10px]">{topic.content_format}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{topic.generated_content}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleGenerateVariant(topic)}
                        disabled={generatingVariant === topic.id}
                        title="A/B variant genereren"
                      >
                        {generatingVariant === topic.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTopic(topic)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* A/B Variants */}
                {variants.map((variant, i) => (
                  <Card key={variant.id} className="ml-6 border-l-2 border-primary/30">
                    <CardContent className="flex items-start gap-4 py-3 px-4">
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        <Sparkles className="h-2.5 w-2.5 mr-1" /> Variant {String.fromCharCode(66 + i)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground line-clamp-3">{variant.generated_content}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTopic(variant)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
              {previewTopic?.variant_of && (
                <Badge variant="outline" className="text-[10px] ml-2"><Sparkles className="h-2.5 w-2.5 mr-1" /> Variant</Badge>
              )}
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
