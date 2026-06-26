import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Send, CheckCircle2, RefreshCw, Linkedin, Twitter, Instagram, FileText } from "lucide-react";
import { useClients, useAllTopics, useRecurringCampaigns, useCampaigns } from "@/hooks/use-marketing-data";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: allTopics, isLoading: loadingTopics } = useAllTopics();
  const { data: recurring, isLoading: loadingRecurring } = useRecurringCampaigns();
  const { data: campaigns } = useCampaigns();
  const { activeClientId } = useActiveClient();

  const loading = loadingClients || loadingTopics || loadingRecurring;

  const clientIdForTopic = (campaignId: string) => campaigns?.find((c) => c.id === campaignId)?.client_id;
  const topics = activeClientId === ALL_CLIENTS
    ? allTopics
    : allTopics?.filter((t) => clientIdForTopic(t.campaign_id) === activeClientId);

  const pending = topics?.filter((t) => t.generated_content && !t.posted_at && t.client_approved !== true) ?? [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const postedThisWeek = topics?.filter((t) => t.posted_at && new Date(t.posted_at) > weekAgo) ?? [];
  const activeRecurring = (recurring?.filter((r) => r.active) ?? []).filter((r) => activeClientId === ALL_CLIENTS || r.client_id === activeClientId);

  const stats = [
    { label: "Wacht op goedkeuring", value: pending.length, icon: CheckCircle2, change: pending.length ? "Beoordeel ze in de Wachtrij" : "Wachtrij is leeg", href: "/wachtrij" },
    { label: "Gepost deze week", value: postedThisWeek.length, icon: Send, change: "Via Buffer gepubliceerd", href: "/inzicht" },
    { label: "Actieve campagnes", value: activeRecurring.length, icon: RefreshCw, change: activeRecurring.length ? "Scheduler draait 5 slots/dag" : "Maak een recurring campagne", href: "/recurring" },
    { label: "Klanten", value: clients?.length ?? 0, icon: Users, change: "Elk met eigen Buffer", href: "/klanten" },
  ];

  const recent = (topics ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welkom bij je Marketing Machine</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <a key={stat.label} href={stat.href}>
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
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zo werkt je dag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction step="1" title="Goedkeuren" description={pending.length ? `${pending.length} post(s) wachten op je beoordeling — bekijk tekst en beeld` : "Wachtrij is leeg; de scheduler vult hem op de tijdslots"} href="/wachtrij" />
            <QuickAction step="2" title="Voorraad bijvullen (optioneel)" description="Genereer hooks in een bestaande campagne; de scheduler gebruikt eerst jouw voorraad" href="/maken" />
            <QuickAction step="3" title="Campagnes bijsturen" description="Keywords, frequentie per platform en auto-publish per kanaal" href="/recurring" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recente posts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : !recent.length ? (
              <p className="text-muted-foreground text-sm">Nog geen posts — de scheduler vult dit vanzelf.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((t) => {
                  const Icon = platformIcons[t.platform] || FileText;
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground truncate flex-1">{t.hook}</span>
                      <Badge variant={t.posted_at ? "default" : t.client_approved === true ? "secondary" : "outline"} className="text-[10px] shrink-0">
                        {t.posted_at ? "gepost" : t.client_approved === true ? "goedgekeurd" : "wacht"}
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

function QuickAction({ step, title, description, href }: { step: string; title: string; description: string; href: string }) {
  return (
    <a href={href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors group">
      <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">{step}</div>
      <div>
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}
