import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Send, CheckCircle2, RefreshCw, Linkedin, Twitter, Instagram, FileText,
  Loader2, Eye, ArrowRight, AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useClients, useAllTopics, useRecurringCampaigns, useCampaigns, useUpdateTopic, type MmTopic } from "@/hooks/use-marketing-data";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/webhooks";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: allTopics, isLoading: loadingTopics, refetch } = useAllTopics();
  const { data: recurring, isLoading: loadingRecurring } = useRecurringCampaigns();
  const { data: campaigns } = useCampaigns();
  const updateTopic = useUpdateTopic();
  const { toast } = useToast();
  const { activeClientId } = useActiveClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const loading = loadingClients || loadingTopics || loadingRecurring;

  const clientIdForTopic = (campaignId: string) => campaigns?.find((c) => c.id === campaignId)?.client_id;
  const clientNameFor = (t: MmTopic) => clients?.find((cl) => cl.id === clientIdForTopic(t.campaign_id))?.name;
  const topics = activeClientId === ALL_CLIENTS
    ? allTopics
    : allTopics?.filter((t) => clientIdForTopic(t.campaign_id) === activeClientId);

  const pending = topics?.filter((t) => t.generated_content && !t.posted_at && t.client_approved == null) ?? [];
  const ready = topics?.filter((t) => t.generated_content && !t.posted_at && t.client_approved === true) ?? [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const postedThisWeek = topics?.filter((t) => t.posted_at && new Date(t.posted_at) > weekAgo) ?? [];
  const activeRecurring = (recurring?.filter((r) => r.active) ?? []).filter((r) => activeClientId === ALL_CLIENTS || r.client_id === activeClientId);

  // Weekbehoefte uit de platform-schema's van actieve campagnes vs. goedgekeurde voorraad
  const weekQuota = activeRecurring.reduce((sum, r) => {
    const s = (r.platform_schedule ?? {}) as { x_per_day?: number; linkedin_per_week?: number; instagram_per_week?: number };
    return sum + (s.x_per_day ?? 0) * 7 + (s.linkedin_per_week ?? 0) + (s.instagram_per_week ?? 0);
  }, 0);
  const coverageDays = weekQuota > 0 ? Math.floor((ready.length / weekQuota) * 7) : null;

  const approve = async (t: MmTopic) => {
    setBusyId(t.id);
    try {
      await updateTopic.mutateAsync({ id: t.id, client_approved: true });
      await refetch();
      toast({ title: "Goedgekeurd" });
    } catch (err) {
      toast({ title: "Mislukt", description: getErrorMessage(err), variant: "destructive" });
    }
    setBusyId(null);
  };

  const stats = [
    { label: "Te beoordelen", value: pending.length, icon: CheckCircle2, change: pending.length ? "Keur hieronder direct goed" : "Niets te beoordelen", href: "/wachtrij" },
    { label: "Klaar om te posten", value: ready.length, icon: Send, change: coverageDays != null ? `Voorraad voor ±${coverageDays} dag(en)` : "Geen actieve campagnes", href: "/wachtrij" },
    { label: "Gepost deze week", value: postedThisWeek.length, icon: RefreshCw, change: weekQuota ? `Weekbehoefte: ${weekQuota} posts` : "Via Buffer gepubliceerd", href: "/inzicht" },
    { label: "Actieve campagnes", value: activeRecurring.length, icon: Users, change: activeRecurring.length ? "Scheduler vult automatisch bij" : "Maak een recurring campagne", href: "/recurring" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vandaag</h1>
        <p className="text-muted-foreground">Wat nu jouw aandacht nodig heeft</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.href}>
            <Card className="gradient-card hover:shadow-md transition-shadow h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-foreground">{stat.value}</div>}
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Voorraad-alarm: minder dan 2 dagen dekking terwijl er wél een schema draait */}
      {!loading && weekQuota > 0 && coverageDays != null && coverageDays < 2 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-foreground flex-1">
              Goedgekeurde voorraad is bijna op ({ready.length} post(s) voor een weekbehoefte van {weekQuota}).
              Keur posts goed of vul de voorraad aan.
            </p>
            <Button asChild size="sm" variant="outline"><Link to="/maken">Naar Maken</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Werk-lijst: direct beoordelen vanaf het dashboard */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Nu beoordelen</CardTitle>
            {pending.length > 0 && (
              <Link to="/wachtrij" className="text-xs text-primary flex items-center gap-1">alles bekijken <ArrowRight className="h-3 w-3" /></Link>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : pending.length === 0 ? (
              <p className="text-muted-foreground text-sm">Niets te beoordelen. De scheduler vult de wachtrij automatisch aan.</p>
            ) : (
              <div className="space-y-2">
                {pending.slice(0, 5).map((t) => {
                  const Icon = platformIcons[t.platform] || FileText;
                  return (
                    <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground truncate">{t.hook}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {clientNameFor(t)}
                          {t.quality_score != null && <> · redactie {t.quality_score}/100</>}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" disabled={busyId === t.id} onClick={() => approve(t)} title="Goedkeuren">
                        {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 shrink-0" title="Bekijken in Wachtrij">
                        <Link to="/wachtrij"><Eye className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recente activiteit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recente posts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : !(topics ?? []).length ? (
              <p className="text-muted-foreground text-sm">Nog geen posts — de scheduler vult dit vanzelf.</p>
            ) : (
              <div className="space-y-2">
                {(topics ?? []).slice(0, 6).map((t) => {
                  const Icon = platformIcons[t.platform] || FileText;
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground truncate flex-1">{t.hook}</span>
                      <Badge variant={t.posted_at ? "default" : t.client_approved === true ? "secondary" : "outline"} className="text-[10px] shrink-0">
                        {t.posted_at ? "gepost" : t.client_approved === true ? "klaar" : t.generated_content ? "te beoordelen" : "idee"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
