import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Linkedin, Twitter, Instagram, FileText, CheckCircle2, XCircle, MessageSquare, Eye, Clock, RefreshCw, Loader2 } from "lucide-react";
import { useCampaigns, useTopics, useUpdateTopic, useClients, type MmTopic } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/webhooks";
import { supabase } from "@/integrations/supabase/client";
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
  DialogFooter,
} from "@/components/ui/dialog";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

type ApprovalStatus = "pending_review" | "feedback" | "client_approved" | "approved";

function getApprovalBadge(topic: MmTopic) {
  const feedback = (topic as any).client_feedback;
  const clientApproved = (topic as any).client_approved;

  if (clientApproved === true) return { label: "Klant akkoord", variant: "default" as const, color: "text-primary" };
  if (clientApproved === false) return { label: "Afgekeurd", variant: "destructive" as const, color: "text-destructive" };
  if (feedback) return { label: "Feedback", variant: "secondary" as const, color: "text-accent-foreground" };
  if (topic.generated_content) return { label: "Wacht op review", variant: "outline" as const, color: "text-muted-foreground" };
  return { label: "Geen content", variant: "outline" as const, color: "text-muted-foreground" };
}

export default function ApprovalWorkflow() {
  const { data: clients } = useClients();
  const { data: campaigns } = useCampaigns();
  const updateTopic = useUpdateTopic();
  const { toast } = useToast();

  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const { data: topics, refetch } = useTopics(selectedCampaignId || undefined);
  const [feedbackDialog, setFeedbackDialog] = useState<MmTopic | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [previewTopic, setPreviewTopic] = useState<MmTopic | null>(null);
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId);
  const campaignClient = clients?.find((cl) => cl.id === selectedCampaign?.client_id);

  // Roept de settings-driven edge function rechtstreeks aan (provider/model/stijl/
  // formaat uit mm_image_settings + per-klant override), niet meer de oude n8n-webhook.
  const handleRegenerateImage = async (topic: MmTopic) => {
    setRegeneratingImageId(topic.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          client_id: campaignClient?.id,
          hook: topic.hook,
          campaign_theme: selectedCampaign?.theme || "",
          platform: topic.platform,
        },
      });
      if (error) throw new Error(error.message || "Edge function gaf een fout");
      const mediaUrl = data && typeof data === "object" ? (data as { media_url?: string; error?: string }).media_url : undefined;
      if (!mediaUrl) throw new Error((data as { error?: string })?.error || "Geen media_url terug van generate-image.");
      await updateTopic.mutateAsync({ id: topic.id, media_url: mediaUrl });
      await refetch();
      toast({ title: "Nieuw beeld gegenereerd 🖼️" });
    } catch (err) {
      toast({ title: "Beeld genereren mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setRegeneratingImageId(null);
  };

  const contentTopics = topics?.filter((t) => t.generated_content && !t.variant_of) || [];
  const pendingReview = contentTopics.filter((t) => !(t as any).client_approved && !(t as any).client_feedback);
  const withFeedback = contentTopics.filter((t) => (t as any).client_feedback && !(t as any).client_approved);
  const approved = contentTopics.filter((t) => (t as any).client_approved === true);

  const handleApprove = async (topic: MmTopic) => {
    try {
      await updateTopic.mutateAsync({ id: topic.id, client_approved: true } as any);
      await refetch();
      toast({ title: "Content goedgekeurd ✅" });
    } catch {
      toast({ title: "Fout bij goedkeuren", variant: "destructive" });
    }
  };

  const handleReject = async (topic: MmTopic) => {
    try {
      await updateTopic.mutateAsync({ id: topic.id, client_approved: false } as any);
      await refetch();
      toast({ title: "Content afgekeurd" });
    } catch {
      toast({ title: "Fout bij afkeuren", variant: "destructive" });
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackDialog || !feedbackText.trim()) return;
    try {
      await updateTopic.mutateAsync({ id: feedbackDialog.id, client_feedback: feedbackText.trim() } as any);
      await refetch();
      setFeedbackDialog(null);
      setFeedbackText("");
      toast({ title: "Feedback opgeslagen 💬" });
    } catch {
      toast({ title: "Fout bij opslaan feedback", variant: "destructive" });
    }
  };

  const TopicCard = ({ topic }: { topic: MmTopic }) => {
    const Icon = platformIcons[topic.platform] || FileText;
    const badge = getApprovalBadge(topic);
    const feedback = (topic as any).client_feedback;

    return (
      <Card>
        <CardContent className="flex items-start gap-4 py-3 px-4">
          <Badge variant="secondary" className="mt-1 shrink-0">
            <Icon className="h-3 w-3 mr-1" />
            {topic.platform}
          </Badge>
          {topic.media_url && (
            <button onClick={() => setPreviewTopic(topic)} className="shrink-0" title="Bekijk beeld">
              <img src={topic.media_url} alt="" className="h-14 w-14 rounded-md object-cover border border-border" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-foreground">{topic.hook}</p>
              <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{topic.generated_content}</p>
            {feedback && (
              <div className="mt-2 p-2 rounded bg-accent/50 border border-border">
                <p className="text-xs text-foreground flex items-start gap-1">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  {feedback}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTopic(topic)} title="Bekijk content">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRegenerateImage(topic)}
              disabled={regeneratingImageId === topic.id}
              title={topic.media_url ? "Nieuw beeld genereren" : "Beeld genereren"}
            >
              {regeneratingImageId === topic.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFeedbackDialog(topic); setFeedbackText((topic as any).client_feedback || ""); }} title="Feedback geven">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleApprove(topic)} title="Goedkeuren">
              <CheckCircle2 className={`h-4 w-4 ${(topic as any).client_approved === true ? "text-primary" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReject(topic)} title="Afkeuren">
              <XCircle className={`h-4 w-4 ${(topic as any).client_approved === false ? "text-destructive" : "text-muted-foreground"}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Goedkeuring & Feedback</h1>
        <p className="text-muted-foreground">Laat klanten content reviewen en feedback geven vóór publicatie</p>
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
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {pendingReview.length} wacht op review</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {withFeedback.length} met feedback</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {approved.length} goedgekeurd</span>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingReview.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" /> Wacht op review
          </h2>
          {pendingReview.map((t) => <TopicCard key={t.id} topic={t} />)}
        </div>
      )}

      {withFeedback.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Feedback ontvangen
          </h2>
          {withFeedback.map((t) => <TopicCard key={t.id} topic={t} />)}
        </div>
      )}

      {approved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Goedgekeurd door klant
          </h2>
          {approved.map((t) => <TopicCard key={t.id} topic={t} />)}
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackDialog} onOpenChange={() => setFeedbackDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback geven</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{feedbackDialog?.hook}</p>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Schrijf feedback voor de klant..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialog(null)}>Annuleren</Button>
            <Button onClick={handleSaveFeedback} disabled={!feedbackText.trim()}>Feedback opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTopic} onOpenChange={() => setPreviewTopic(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTopic && (() => { const Icon = platformIcons[previewTopic.platform]; return Icon ? <Icon className="h-4 w-4" /> : null; })()}
              {previewTopic?.hook}
            </DialogTitle>
          </DialogHeader>
          {previewTopic?.media_url && (
            <img src={previewTopic.media_url} alt="" className="w-full rounded-lg border border-border" />
          )}
          <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed max-h-80 overflow-y-auto">
            {previewTopic?.generated_content}
          </div>
          {(previewTopic as any)?.client_feedback && (
            <div className="p-3 rounded bg-accent/50 border border-border">
              <p className="text-xs font-medium text-foreground mb-1">💬 Klant feedback:</p>
              <p className="text-sm text-foreground">{(previewTopic as any).client_feedback}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
