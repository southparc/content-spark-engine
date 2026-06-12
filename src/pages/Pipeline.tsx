import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Lightbulb, Clock, CheckCircle2, Send, Linkedin, Twitter, Instagram, FileText, ImageIcon, ArrowRight } from "lucide-react";
import { useAllTopics, useCampaigns, useClients, type MmTopic } from "@/hooks/use-marketing-data";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

function TopicMiniCard({ topic, clientName, dimmed }: { topic: MmTopic; clientName?: string; dimmed?: boolean }) {
  const Icon = platformIcons[topic.platform] || FileText;
  return (
    <div className={`rounded-lg border border-border bg-card p-2.5 space-y-1 ${dimmed ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span>{topic.platform}</span>
        {topic.media_url && <ImageIcon className="h-3 w-3 text-primary" />}
        {topic.content_format === "longread" && <Badge variant="outline" className="text-[9px] py-0">longread</Badge>}
        {clientName && <span className="ml-auto truncate max-w-[80px]">{clientName}</span>}
      </div>
      <p className="text-xs text-foreground leading-snug line-clamp-2">{topic.hook}</p>
      {topic.posted_at && (
        <p className="text-[10px] text-muted-foreground">
          {new Date(topic.posted_at).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

export default function Pipeline() {
  const { data: topics, isLoading } = useAllTopics();
  const { data: campaigns } = useCampaigns();
  const { data: clients } = useClients();

  const clientNameFor = (topic: MmTopic) => {
    const campaign = campaigns?.find((c) => c.id === topic.campaign_id);
    return clients?.find((cl) => cl.id === campaign?.client_id)?.name;
  };

  const all = topics ?? [];
  const voorraad = all.filter((t) => !t.generated_content && t.client_approved !== false);
  const teBeoordelen = all.filter((t) => t.generated_content && !t.posted_at && t.client_approved == null);
  const afgekeurd = all.filter((t) => t.generated_content && !t.posted_at && t.client_approved === false);
  const goedgekeurd = all.filter((t) => t.generated_content && !t.posted_at && t.client_approved === true);
  const gepost = all.filter((t) => t.posted_at).slice(0, 8);

  const columns = [
    {
      key: "voorraad",
      title: "Voorraad (idee)",
      icon: Lightbulb,
      count: voorraad.length,
      hint: "Hooks zonder uitgewerkte post. De scheduler pakt op elk tijdslot de oudste passende hook en werkt hem uit. Bijvullen: Voorraad & campagne.",
      href: "/campagne",
      hrefLabel: "Voorraad bijvullen",
      items: voorraad.slice(0, 10),
      extra: null as MmTopic[] | null,
    },
    {
      key: "review",
      title: "Te beoordelen",
      icon: Clock,
      count: teBeoordelen.length,
      hint: "Complete posts (tekst + beeld) die op jouw goedkeuring wachten.",
      href: "/goedkeuring",
      hrefLabel: "Nu beoordelen",
      items: teBeoordelen.slice(0, 10),
      extra: afgekeurd.length ? afgekeurd.slice(0, 4) : null,
    },
    {
      key: "goedgekeurd",
      title: "Goedgekeurd",
      icon: CheckCircle2,
      count: goedgekeurd.length,
      hint: "Klaar voor publicatie. Handmatig via Publiceren, of automatisch als auto-publish voor het platform aanstaat.",
      href: "/publiceren",
      hrefLabel: "Publiceren",
      items: goedgekeurd.slice(0, 10),
      extra: null,
    },
    {
      key: "gepost",
      title: "Gepost",
      icon: Send,
      count: all.filter((t) => t.posted_at).length,
      hint: "Live via Buffer op het kanaal van de klant.",
      href: "/geschiedenis",
      hrefLabel: "Geschiedenis",
      items: gepost,
      extra: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-muted-foreground">
          Van idee tot gepubliceerde post — de scheduler draait om 08:30 · 11:00 · 13:30 · 16:00 · 19:30 (LinkedIn om 11:00, Instagram om 16:00 op ma/wo/vr, X elk slot)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columns.map((col, i) => (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <col.icon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{col.title}</h2>
              <Badge variant="secondary" className="text-xs">{isLoading ? "…" : col.count}</Badge>
              {i < columns.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto hidden xl:block" />}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{col.hint}</p>
            <Button asChild size="sm" variant={col.key === "review" && col.count > 0 ? "default" : "outline"} className="w-full">
              <Link to={col.href}>{col.hrefLabel}</Link>
            </Button>
            <div className="space-y-2">
              {isLoading && <Skeleton className="h-20 w-full" />}
              {!isLoading && col.items.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center text-xs text-muted-foreground">Leeg</CardContent>
                </Card>
              )}
              {col.items.map((t) => (
                <TopicMiniCard key={t.id} topic={t} clientName={clientNameFor(t)} />
              ))}
              {col.items.length < col.count && (
                <p className="text-[10px] text-muted-foreground text-center">+ {col.count - col.items.length} meer</p>
              )}
              {col.extra && (
                <div className="pt-2 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Afgekeurd ({afgekeurd.length})</p>
                  {col.extra.map((t) => (
                    <TopicMiniCard key={t.id} topic={t} clientName={clientNameFor(t)} dimmed />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
