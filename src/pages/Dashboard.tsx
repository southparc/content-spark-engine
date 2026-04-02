import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Sparkles, Send, TrendingUp } from "lucide-react";

const stats = [
  { label: "Klanten", value: "2", icon: Users, change: "+1 deze week" },
  { label: "Campagnes", value: "0", icon: Sparkles, change: "Start je eerste!" },
  { label: "Gepost", value: "0", icon: Send, change: "Nog geen posts" },
  { label: "Engagement", value: "—", icon: TrendingUp, change: "Binnenkort" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welkom bij je Marketing Machine</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Snel starten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction
              step="1"
              title="Klant toevoegen"
              description="Voeg je eerste klant toe met branding en tone-of-voice"
              href="/klanten"
            />
            <QuickAction
              step="2"
              title="Campagne starten"
              description="Kies een klant, voer een thema in en genereer topics"
              href="/campagne"
            />
            <QuickAction
              step="3"
              title="n8n koppelen"
              description="Stel je webhook URLs in voor automatische content generatie"
              href="/instellingen"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recente activiteit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Nog geen activiteit. Start je eerste campagne om hier resultaten te zien.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ step, title, description, href }: { step: string; title: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
    >
      <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
        {step}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}
