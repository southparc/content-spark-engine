import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Linkedin, Twitter, Instagram, FileText, Send, CheckCircle2 } from "lucide-react";
import { useClients, useCampaigns, useAllTopics } from "@/hooks/use-marketing-data";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = {
  linkedin: "hsl(172, 66%, 40%)",
  x: "hsl(220, 25%, 30%)",
  instagram: "hsl(330, 70%, 55%)",
};

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

export default function Analytics() {
  const { data: clients } = useClients();
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: allTopics, isLoading: loadingTopics } = useAllTopics();
  const { activeClientId } = useActiveClient();

  const isLoading = loadingCampaigns || loadingTopics;

  const stats = useMemo(() => {
    if (!allTopics || !campaigns) return null;

    // Scope op de actieve klant
    const clientList = activeClientId === ALL_CLIENTS ? clients : clients?.filter((c) => c.id === activeClientId);
    const allowedCampaignIds = new Set((campaigns).filter((c) => activeClientId === ALL_CLIENTS || c.client_id === activeClientId).map((c) => c.id));
    const topics = activeClientId === ALL_CLIENTS ? allTopics : allTopics.filter((t) => allowedCampaignIds.has(t.campaign_id));

    const total = topics.length;
    const posted = topics.filter((t) => t.posted_at).length;
    const approved = topics.filter((t) => t.status === "approved").length;
    const withContent = topics.filter((t) => t.generated_content).length;

    const byPlatform = ["linkedin", "x", "instagram"].map((p) => ({
      platform: p,
      total: topics.filter((t) => t.platform === p).length,
      posted: topics.filter((t) => t.platform === p && t.posted_at).length,
      content: topics.filter((t) => t.platform === p && t.generated_content).length,
    }));

    const byClient = clientList?.map((client) => {
      const clientCampaignIds = campaigns
        .filter((c) => c.client_id === client.id)
        .map((c) => c.id);
      const clientTopics = allTopics.filter((t) => clientCampaignIds.includes(t.campaign_id));
      return {
        name: client.name,
        topics: clientTopics.length,
        posted: clientTopics.filter((t) => t.posted_at).length,
        content: clientTopics.filter((t) => t.generated_content).length,
      };
    }) ?? [];

    // Posts per week (last 8 weeks)
    const now = new Date();
    const weeklyData = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = topics.filter((t) => {
        if (!t.posted_at) return false;
        const d = new Date(t.posted_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      return {
        week: `W${Math.ceil((weekStart.getDate()) / 7)}`,
        posts: count,
      };
    });

    // Engagement per invalshoek (uit de dagelijkse Buffer-sync)
    const engSum = (e: Record<string, number> | null) =>
      e ? (e.reactions ?? 0) + (e.comments ?? 0) + (e.shares ?? 0) + (e.reposts ?? 0) + (e.clicks ?? 0) + (e.likes ?? 0) : 0;
    const withEngagement = topics.filter((t) => t.posted_at && t.engagement);
    const totalImpressions = withEngagement.reduce((s, t) => s + (t.engagement?.impressions ?? t.engagement?.reach ?? t.engagement?.views ?? 0), 0);
    const totalInteractions = withEngagement.reduce((s, t) => s + engSum(t.engagement), 0);
    const angleMap = new Map<string, { posts: number; interactions: number }>();
    for (const t of withEngagement) {
      if (!t.angle) continue;
      const cur = angleMap.get(t.angle) ?? { posts: 0, interactions: 0 };
      cur.posts += 1;
      cur.interactions += engSum(t.engagement);
      angleMap.set(t.angle, cur);
    }
    const byAngle = [...angleMap.entries()]
      .map(([angle, v]) => ({ angle, posts: v.posts, avg: v.posts ? Math.round((v.interactions / v.posts) * 10) / 10 : 0 }))
      .sort((a, b) => b.avg - a.avg);

    return { total, posted, approved, withContent, byPlatform, byClient, weeklyData, campaignCount: allowedCampaignIds.size, byAngle, totalImpressions, totalInteractions, syncedPosts: withEngagement.length };
  }, [allTopics, campaigns, clients, activeClientId]);

  const pieData = stats?.byPlatform.map((p) => ({
    name: p.platform,
    value: p.total,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Inzicht in je content prestaties</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !stats ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nog geen data beschikbaar.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={FileText} label="Totaal topics" value={stats.total} sub={`${stats.campaignCount} campagnes`} />
            <StatCard icon={Send} label="Gepubliceerd" value={stats.posted} sub={`${Math.round((stats.posted / Math.max(stats.total, 1)) * 100)}% van totaal`} />
            <StatCard icon={TrendingUp} label="Weergaven" value={stats.totalImpressions} sub={`Over ${stats.syncedPosts} gesyncte posts`} />
            <StatCard icon={CheckCircle2} label="Interacties" value={stats.totalInteractions} sub="Reacties, clicks, shares" />
          </div>

          {stats.byAngle.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prestaties per invalshoek</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Gemiddelde interacties per post, uit de dagelijkse Buffer-sync. De generator geeft de best presterende invalshoeken automatisch meer gewicht.
                </p>
                <div className="space-y-2">
                  {stats.byAngle.map((a, i) => {
                    const max = Math.max(...stats.byAngle.map((x) => x.avg), 1);
                    return (
                      <div key={a.angle} className="flex items-center gap-3 text-sm">
                        <span className="w-24 shrink-0 font-medium text-foreground">{a.angle}</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((a.avg / max) * 100)}%` }} />
                        </div>
                        <span className="w-32 shrink-0 text-right text-muted-foreground text-xs">
                          {a.avg} gem. · {a.posts} post{a.posts === 1 ? "" : "s"}
                        </span>
                        {i === 0 && a.avg > 0 && <Badge variant="secondary" className="text-[10px] shrink-0">beste</Badge>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Per platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.byPlatform.map((p) => {
                    const Icon = platformIcons[p.platform] || FileText;
                    const pct = Math.round((p.posted / Math.max(p.total, 1)) * 100);
                    return (
                      <div key={p.platform} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-foreground font-medium">
                            <Icon className="h-4 w-4" /> {p.platform}
                          </span>
                          <span className="text-muted-foreground">{p.posted}/{p.total} gepubliceerd</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: COLORS[p.platform as keyof typeof COLORS] || "hsl(var(--primary))",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verdeling per platform</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[entry.name as keyof typeof COLORS] || "#ccc"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Per klant</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byClient.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen klanten gevonden.</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byClient}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="topics" name="Topics" fill="hsl(172, 66%, 40%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="content" name="Content" fill="hsl(172, 66%, 60%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="posted" name="Gepost" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub: string }) {
  return (
    <Card className="gradient-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
