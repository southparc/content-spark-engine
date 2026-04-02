import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import { useCampaigns, useClients } from "@/hooks/use-marketing-data";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function Geschiedenis() {
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: clients } = useClients();

  const clientName = (id: string) => clients?.find((c) => c.id === id)?.name ?? "Onbekend";

  const statusColor: Record<string, string> = {
    draft: "bg-secondary text-secondary-foreground",
    generating: "bg-warning text-warning-foreground",
    review: "bg-accent text-accent-foreground",
    approved: "bg-primary text-primary-foreground",
    posted: "bg-success text-success-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Geschiedenis</h1>
        <p className="text-muted-foreground">Overzicht van al je campagnes</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !campaigns?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <History className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nog geen campagnes uitgevoerd.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div>
                  <p className="font-medium text-foreground">{c.theme}</p>
                  <p className="text-xs text-muted-foreground">
                    {clientName(c.client_id)} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: nl })}
                  </p>
                </div>
                <Badge className={statusColor[c.status] ?? ""} variant="secondary">
                  {c.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
