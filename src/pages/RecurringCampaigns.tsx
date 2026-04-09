import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Plus, Trash2, Calendar, Clock } from "lucide-react";
import { useClients } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
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

interface RecurringTemplate {
  id: string;
  client_id: string;
  theme: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  day_of_week?: string;
  active: boolean;
  created_at: string;
  last_run?: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Dagelijks",
  weekly: "Wekelijks",
  biweekly: "Om de week",
  monthly: "Maandelijks",
};

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

export default function RecurringCampaigns() {
  const { data: clients } = useClients();
  const { toast } = useToast();

  // Local state for now - will be backed by DB table mm_recurring_campaigns
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    theme: "",
    frequency: "weekly" as RecurringTemplate["frequency"],
    day_of_week: "Maandag",
  });

  const handleCreate = () => {
    if (!form.client_id || !form.theme.trim()) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }
    const newTemplate: RecurringTemplate = {
      id: crypto.randomUUID(),
      client_id: form.client_id,
      theme: form.theme,
      frequency: form.frequency,
      day_of_week: form.frequency !== "daily" ? form.day_of_week : undefined,
      active: true,
      created_at: new Date().toISOString(),
    };
    setTemplates((prev) => [newTemplate, ...prev]);
    setShowDialog(false);
    setForm({ client_id: "", theme: "", frequency: "weekly", day_of_week: "Maandag" });
    toast({ title: "Recurring campagne aangemaakt! 🔄" });
  };

  const toggleActive = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Template verwijderd" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring Campaigns</h1>
          <p className="text-muted-foreground">Automatiseer wekelijks terugkerende content thema's</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gradient-primary border-0 text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Nieuw template
        </Button>
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nog geen recurring campaigns.</p>
            <p className="text-xs text-muted-foreground mt-1">Maak een template om automatisch campagnes te genereren op een vast schema.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {templates.map((template) => {
          const client = clients?.find((c) => c.id === template.client_id);
          return (
            <Card key={template.id} className={!template.active ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-4 py-4 px-4">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <RefreshCw className={`h-5 w-5 text-primary ${template.active ? "animate-spin-slow" : ""}`} style={{ animationDuration: "8s" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{template.theme}</p>
                    <Badge variant={template.active ? "default" : "secondary"}>
                      {template.active ? "Actief" : "Gepauzeerd"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{client?.name || "Onbekende klant"}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {FREQUENCY_LABELS[template.frequency]}
                      {template.day_of_week && ` · ${template.day_of_week}`}
                    </span>
                    {template.last_run && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Laatst: {new Date(template.last_run).toLocaleDateString("nl-NL")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={template.active} onCheckedChange={() => toggleActive(template.id)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hoe werkt het?</CardTitle>
          <CardDescription>Recurring campaigns automatiseren je content workflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
            <p>Maak een template met klant, thema en frequentie</p>
          </div>
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
            <p>n8n triggert automatisch op het ingestelde schema via een cron webhook</p>
          </div>
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span>
            <p>Topics worden gegenereerd, content wordt gemaakt en klaar gezet voor review</p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuw recurring template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Klant</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((p) => ({ ...p, client_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een klant..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Thema / onderwerp</Label>
              <Input value={form.theme} onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))} placeholder="Bijv. Wekelijkse tips, Maandelijks nieuws..." />
            </div>
            <div>
              <Label>Frequentie</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((p) => ({ ...p, frequency: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.frequency !== "daily" && (
              <div>
                <Label>Dag</Label>
                <Select value={form.day_of_week} onValueChange={(v) => setForm((p) => ({ ...p, day_of_week: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreate}>Aanmaken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
