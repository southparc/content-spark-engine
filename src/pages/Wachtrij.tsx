import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Linkedin, Twitter, Instagram, FileText, CheckCircle2, XCircle, RefreshCw,
  Loader2, Eye, Send, Clock, CircleDot,
} from "lucide-react";
import {
  useAllTopics, useCampaigns, useClients, useSettings, useUpdateTopic, type MmTopic,
} from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";
import { getErrorMessage, callWebhook } from "@/lib/webhooks";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

// Publiceert via de post-webhook (Kestra/Buffer) en controleert de Buffer-respons.
async function publishViaWebhook(webhookUrl: string, topic: MmTopic, clientId: string, clientName: string, channelId: string, campaignTheme?: string) {
  const data = await callWebhook({
    webhookUrl,
    allowEmptyResponse: true,
    payload: {
      topic_id: topic.id, client_id: clientId, hook: topic.hook, platform: topic.platform,
      content: topic.generated_content, media_url: topic.media_url, client_name: clientName,
      campaign_theme: campaignTheme, buffer_channel_id: channelId,
    },
  });
  if (data && typeof data === "object") {
    const resp = data as { status?: string; buffer?: { data?: { createPost?: { message?: string; __typename?: string } } } };
    if (resp.status && resp.status !== "ok") {
      const msg = resp.buffer?.data?.createPost?.message || resp.buffer?.data?.createPost?.__typename || "onbekende Buffer-fout";
      throw new Error(`Buffer weigerde de post: ${msg}`);
    }
  }
}

export default function Wachtrij() {
  const { data: topics, isLoading, refetch } = useAllTopics();
  const { data: campaigns } = useCampaigns();
  const { data: clients } = useClients();
  const { data: settings } = useSettings();
  const updateTopic = useUpdateTopic();
  const { toast } = useToast();
  const { activeClientId } = useActiveClient();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [regenId, setRegenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MmTopic | null>(null);

  const postWebhook = settings?.webhook_post;

  const campaignFor = (t: MmTopic) => campaigns?.find((c) => c.id === t.campaign_id);
  const clientFor = (t: MmTopic) => {
    const c = campaignFor(t);
    return clients?.find((cl) => cl.id === c?.client_id);
  };

  const all = (topics ?? []).filter((t) => activeClientId === ALL_CLIENTS || clientFor(t)?.id === activeClientId);
  const teBeoordelen = all.filter((t) => t.generated_content && !t.posted_at && t.client_approved == null);
  const goedgekeurd = all.filter((t) => t.generated_content && !t.posted_at && t.client_approved === true);
  const afgekeurd = all.filter((t) => t.generated_content && !t.posted_at && t.client_approved === false);
  const gepost = [...all.filter((t) => t.posted_at)].sort((a, b) => (b.posted_at || "").localeCompare(a.posted_at || "")).slice(0, 12);

  const setApproval = async (t: MmTopic, value: boolean) => {
    setBusyId(t.id);
    try {
      await updateTopic.mutateAsync({ id: t.id, client_approved: value });
      await refetch();
      toast({ title: value ? "Goedgekeurd" : "Afgekeurd" });
    } catch (err) {
      toast({ title: "Mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setBusyId(null);
  };

  const regenerate = async (t: MmTopic) => {
    setRegenId(t.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { client_id: clientFor(t)?.id, hook: t.hook, campaign_theme: campaignFor(t)?.theme || "", platform: t.platform },
      });
      if (error) throw new Error(error.message);
      const url = (data as { media_url?: string; error?: string })?.media_url;
      if (!url) throw new Error((data as { error?: string })?.error || "Geen beeld terug.");
      await updateTopic.mutateAsync({ id: t.id, media_url: url });
      await refetch();
      toast({ title: "Nieuw beeld gegenereerd" });
    } catch (err) {
      toast({ title: "Beeld mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setRegenId(null);
  };

  const publish = async (t: MmTopic) => {
    if (!postWebhook?.trim()) {
      toast({ title: "Geen publicatie-webhook ingesteld", variant: "destructive" });
      return;
    }
    const client = clientFor(t);
    const channelId = client?.buffer_profiles?.[t.platform] || "";
    if (!channelId) {
      toast({ title: "Geen Buffer-kanaal", description: `${client?.name || "Klant"} heeft geen ${t.platform}-kanaal. Stel in via Klanten.`, variant: "destructive" });
      return;
    }
    setBusyId(t.id);
    try {
      await publishViaWebhook(postWebhook, t, client!.id, client!.name, channelId, campaignFor(t)?.theme);
      await updateTopic.mutateAsync({ id: t.id, posted_at: new Date().toISOString() });
      await refetch();
      toast({ title: "Gepubliceerd via Buffer 🚀" });
    } catch (err) {
      toast({ title: "Publiceren mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setBusyId(null);
  };

  const Avatar = ({ t }: { t: MmTopic }) => {
    const Icon = platformIcons[t.platform] || FileText;
    return <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" /> {t.platform}{clientFor(t) ? ` · ${clientFor(t)!.name}` : ""}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wachtrij</h1>
        <p className="text-muted-foreground">Beoordeel en publiceer hier — van te beoordelen tot gepost, zonder van pagina te wisselen.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Te beoordelen */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Te beoordelen</h2>
            <Badge variant={teBeoordelen.length ? "default" : "secondary"} className="text-xs">{isLoading ? "…" : teBeoordelen.length}</Badge>
          </div>
          {!isLoading && teBeoordelen.length === 0 && <EmptyCol text="Niets te beoordelen" />}
          {teBeoordelen.map((t) => (
            <Card key={t.id} className="ring-1 ring-primary/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {t.media_url && <button onClick={() => setPreview(t)}><img src={t.media_url} alt="" className="h-11 w-11 rounded-md object-cover border border-border shrink-0" /></button>}
                  <div className="min-w-0 flex-1">
                    <Avatar t={t} />
                    <p className="text-xs text-foreground line-clamp-2 mt-1">{t.hook}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <ActionBtn label="Goedkeuren" tone="success" loading={busyId === t.id} onClick={() => setApproval(t, true)}><CheckCircle2 className="h-3.5 w-3.5" /></ActionBtn>
                  <ActionBtn label="Afkeuren" tone="danger" onClick={() => setApproval(t, false)}><XCircle className="h-3.5 w-3.5" /></ActionBtn>
                  <ActionBtn label="Nieuw beeld" loading={regenId === t.id} onClick={() => regenerate(t)}><RefreshCw className="h-3.5 w-3.5" /></ActionBtn>
                  <ActionBtn label="Bekijk" onClick={() => setPreview(t)}><Eye className="h-3.5 w-3.5" /></ActionBtn>
                </div>
              </CardContent>
            </Card>
          ))}
          {afgekeurd.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Afgekeurd ({afgekeurd.length})</p>
              {afgekeurd.slice(0, 4).map((t) => (
                <Card key={t.id} className="opacity-60 mb-2">
                  <CardContent className="p-2.5 flex items-center gap-2">
                    <Avatar t={t} />
                    <button className="ml-auto text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setApproval(t, true)}>terug</button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Goedgekeurd */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Goedgekeurd</h2>
            <Badge variant="secondary" className="text-xs">{isLoading ? "…" : goedgekeurd.length}</Badge>
          </div>
          {!isLoading && goedgekeurd.length === 0 && <EmptyCol text="Niets klaar om te publiceren" />}
          {goedgekeurd.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {t.media_url && <button onClick={() => setPreview(t)}><img src={t.media_url} alt="" className="h-11 w-11 rounded-md object-cover border border-border shrink-0" /></button>}
                  <div className="min-w-0 flex-1">
                    <Avatar t={t} />
                    <p className="text-xs text-foreground line-clamp-2 mt-1">{t.hook}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1 h-8 gradient-primary border-0 text-primary-foreground hover:opacity-90" disabled={busyId === t.id} onClick={() => publish(t)}>
                    {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Publiceer</>}
                  </Button>
                  <ActionBtn label="Terug naar review" onClick={() => updateTopic.mutate({ id: t.id, client_approved: null as any })}><Clock className="h-3.5 w-3.5" /></ActionBtn>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gepost */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Gepost</h2>
            <Badge variant="secondary" className="text-xs">{isLoading ? "…" : all.filter((t) => t.posted_at).length}</Badge>
          </div>
          {!isLoading && gepost.length === 0 && <EmptyCol text="Nog niets gepost" />}
          {gepost.map((t) => (
            <Card key={t.id} className="bg-accent/20 border-0">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <Avatar t={t} />
                  <span className="text-[10px] text-muted-foreground">{t.posted_at ? new Date(t.posted_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : ""}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.hook}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-base">{preview?.hook}</DialogTitle></DialogHeader>
          {preview?.media_url && <img src={preview.media_url} alt="" className="w-full rounded-lg border border-border" />}
          <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed max-h-80 overflow-y-auto">{preview?.generated_content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyCol({ text }: { text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-6 text-center text-xs text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function ActionBtn({ children, label, onClick, loading, tone }: { children: React.ReactNode; label: string; onClick: () => void; loading?: boolean; tone?: "success" | "danger" }) {
  const toneCls = tone === "success" ? "hover:bg-primary/10 text-primary" : tone === "danger" ? "hover:bg-destructive/10 text-destructive" : "hover:bg-accent text-muted-foreground";
  return (
    <button title={label} aria-label={label} onClick={onClick} disabled={loading}
      className={`h-8 flex-1 rounded-md border border-border flex items-center justify-center transition-colors ${toneCls}`}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
