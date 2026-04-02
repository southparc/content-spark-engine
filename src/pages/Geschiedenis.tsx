import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";

export default function Geschiedenis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Geschiedenis</h1>
        <p className="text-muted-foreground">Overzicht van al je campagnes</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <History className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nog geen campagnes uitgevoerd.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start een campagne om hier je geschiedenis te zien.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
