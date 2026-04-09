import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Linkedin, Twitter, Instagram, FileText } from "lucide-react";
import { useClients, useCampaigns, useAllTopics } from "@/hooks/use-marketing-data";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  format, isSameMonth, isSameDay, isToday, addWeeks, subWeeks, startOfDay,
} from "date-fns";
import { nl } from "date-fns/locale";

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: Twitter,
  instagram: Instagram,
};

const statusStyles: Record<string, string> = {
  pending: "bg-secondary text-secondary-foreground",
  approved: "bg-primary/20 text-primary",
  rejected: "bg-destructive/20 text-destructive",
  posted: "bg-success/20 text-success",
};

type ViewMode = "month" | "week";

export default function ContentKalender() {
  const { data: clients } = useClients();
  const { data: campaigns } = useCampaigns();
  const { data: allTopics, isLoading } = useAllTopics();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [filterClient, setFilterClient] = useState<string>("all");

  const filteredTopics = useMemo(() => {
    if (!allTopics) return [];
    if (filterClient === "all") return allTopics;
    const campaignIds = campaigns
      ?.filter((c) => c.client_id === filterClient)
      .map((c) => c.id) ?? [];
    return allTopics.filter((t) => campaignIds.includes(t.campaign_id));
  }, [allTopics, filterClient, campaigns]);

  const getTopicsForDate = (date: Date) => {
    return filteredTopics.filter((t) => {
      const topicDate = t.posted_at ? new Date(t.posted_at) : new Date(t.created_at);
      return isSameDay(topicDate, date);
    });
  };

  const navigate = (dir: number) => {
    setCurrentDate((prev) =>
      viewMode === "month"
        ? dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1)
        : dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = calStart;
    while (d <= calEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentDate, viewMode]);

  const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Kalender</h1>
        <p className="text-muted-foreground">Visueel overzicht van al je content</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center font-semibold text-foreground">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy", { locale: nl })
              : `Week ${format(currentDate, "w", { locale: nl })} — ${format(currentDate, "yyyy")}`
            }
          </div>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
          Vandaag
        </Button>

        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            className={viewMode === "week" ? "gradient-primary border-0 text-primary-foreground" : ""}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("month")}
            className={viewMode === "month" ? "gradient-primary border-0 text-primary-foreground" : ""}
          >
            Maand
          </Button>
        </div>

        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle klanten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle klanten</SelectItem>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <Card>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {weekDays.map((d) => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {calendarDays.map((day) => {
                const dayTopics = getTopicsForDate(day);
                const isCurrentMonth = viewMode === "month" ? isSameMonth(day, currentDate) : true;
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-card min-h-[80px] p-1 ${viewMode === "week" ? "min-h-[200px]" : ""} ${
                      !isCurrentMonth ? "opacity-40" : ""
                    } ${isToday(day) ? "ring-2 ring-primary/30 ring-inset" : ""}`}
                  >
                    <div className={`text-xs font-medium mb-1 px-1 ${
                      isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
                    }`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayTopics.slice(0, viewMode === "week" ? 10 : 3).map((topic) => {
                        const Icon = platformIcons[topic.platform] || FileText;
                        const status = topic.posted_at ? "posted" : topic.status;
                        return (
                          <div
                            key={topic.id}
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate ${statusStyles[status] || "bg-secondary text-secondary-foreground"}`}
                            title={topic.hook}
                          >
                            <Icon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{topic.hook}</span>
                          </div>
                        );
                      })}
                      {dayTopics.length > (viewMode === "week" ? 10 : 3) && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayTopics.length - (viewMode === "week" ? 10 : 3)} meer
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/20" /> Goedgekeurd</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20" /> Afgewezen</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20" /> Gepubliceerd</span>
      </div>
    </div>
  );
}
