import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Plus, Trash2, Calendar, Clock, Zap, Loader2 } from "lucide-react";
import {
  useClients,
  useRecurringCampaigns,
  useCreateRecurringCampaign,
  useUpdateRecurringCampaign,
  useDeleteRecurringCampaign,
} from "@/hooks/use-marketing-data";
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
import { Checkbox } from "@/components/ui/checkbox";

// Moet gelijk blijven aan de dayMap in de n8n-workflow "MM Scheduler"
const FREQUENCY_LABELS: Record<number, string> = {
  1: "1x per week (di)",
  2: "2x per week (ma, do)",
  3: "3x per week (ma, wo, vr)",
  4: "4x per week (ma, di, do, vr)",
  5: "5x per week (werkdagen)",
  6: "6x per week (ma t/m za)",
  7: "Dagelijks",
};

const ALL_PLATFORMS = ["linkedin", "x", "instagram"] as const;

export default function RecurringCampaigns() {
  const { data: clients } = useClients();
  const { data: campaigns, isLoading } = useRecurringCampaigns();
  const createRecurring = useCreateRecurringCampaign();
  const updateRecurring = useUpdateRecurringCampaign();
  const deleteRecurring = useDeleteRecurringCampaign();
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    theme: "",
    onderwerp: "",
    keyword: "",
    platforms: ["linkedin", "x", "instagram"] as string[],
    frequency_per_week: 3,
    auto_publish: false,
  });

  const resetForm = () =>
    setForm({ client_id: "", theme: "", onderwerp: "", keyword: "", platforms: ["linkedin", "x", "instagram"], frequency_per_week: 3, auto_publish: false });

  const handleCreate = async () => {
    if (!form.client_id || !form.theme.trim()) {
      toast({ title: "Kies een klant en vul minimaal een thema in", variant: "destructive" });
      return;
    }
    if (form.platforms.length === 0) {
      toast({ title: "Kies minimaal één platform", variant: "destructive" });
      return;
    }
    try {
      await createRecurring.mutateAsync(form);
      setShowDialog(false);
      resetForm();
      toast({ title: "Recurring campagne actief! 🔄", description: "De scheduler pakt hem op de eerstvolgende postdag om 09:00 op." });
    } catch (err) {
      toast({ title: "Aanmaken mislukt", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const togglePlatform = (p: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring Campaigns</h1>
          <p className="text-muted-foreground">De scheduler genereert automatisch posts op vaste dagen (09:00)</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gradient-primary border-0 text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Nieuwe campagne
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50 mx-auto" />
          </CardContent>
        </Card>
      )}

      {!isLoading && (campaigns?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nog geen recurring campagnes.</p>
            <p className="text-xs text-muted-foreground mt-1">Maak er een aan met thema, onderwerp en keyword — de rest gaat vanzelf.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {campaigns?.map((c) => {
          const client = clients?.find((cl) => cl.id === c.client_id);
          return (
            <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-4 py-4 px-4">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <RefreshCw className={`h-5 w-5 text-primary ${c.active ? "animate-spin-slow" : ""}`} style={{ animationDuration: "8s" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{c.theme}</p>
                    <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Actief" : "Gepauzeerd"}</Badge>
                    {c.auto_publish && (
                      <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3" /> Auto-publish</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{client?.name || "Onbekende klant"}</span>
                    {c.onderwerp && <span>· {c.onderwerp}</span>}
                    {c.keyword && <span>· 🔑 {c.keyword}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {FREQUENCY_LABELS[c.frequency_per_week] || `${c.frequency_per_week}x per week`}
                    </span>
                    <span>{(c.platforms || []).join(", ")}</span>
                    {c.last_run_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Laatst: {new Date(c.last_run_at).toLocaleDateString("nl-NL")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5" title="Direct publiceren zonder goedkeuring">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <Switch
                      checked={c.auto_publish}
                      onCheckedChange={(v) => updateRecurring.mutate({ id: c.id, auto_publish: v })}
                    />
                  </div>
                  <Switch
                    checked={c.active}
                    onCheckedChange={(v) => updateRecurring.mutate({ id: c.id, active: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      deleteRecurring.mutate(c.id);
                      toast({ title: "Campagne verwijderd" });
                    }}
                  >
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
          <CardDescription>De n8n-scheduler draait elke ochtend om 09:00</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
            <p>Maak een campagne met klant, thema, onderwerp en keyword</p>
          </div>
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
            <p>Op elke postdag genereert de scheduler een hook, beeld en complete post (platform roteert)</p>
          </div>
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span>
            <p>Auto-publish uit: post wacht op jouw goedkeuring · Auto-publish aan: post gaat direct via Buffer live</p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe recurring campagne</DialogTitle>
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
              <Label>Thema</Label>
              <Input value={form.theme} onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))} placeholder="Bijv. AI voor financieel adviseurs" />
            </div>
            <div>
              <Label>Onderwerp</Label>
              <Input value={form.onderwerp} onChange={(e) => setForm((p) => ({ ...p, onderwerp: e.target.value }))} placeholder="Bijv. tijdwinst in het adviesgesprek" />
            </div>
            <div>
              <Label>Keyword</Label>
              <Input value={form.keyword} onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))} placeholder="Bijv. ai hypotheekadvies" />
            </div>
            <div>
              <Label>Frequentie</Label>
              <Select value={String(form.frequency_per_week)} onValueChange={(v) => setForm((p) => ({ ...p, frequency_per_week: Number(v) }))}>
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
            <div>
              <Label className="mb-2 block">Platforms</Label>
              <div className="flex gap-4">
                {ALL_PLATFORMS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Auto-publish</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Aan = direct via Buffer live, zonder goedkeuringsstap</p>
              </div>
              <Switch checked={form.auto_publish} onCheckedChange={(v) => setForm((p) => ({ ...p, auto_publish: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreate} disabled={createRecurring.isPending}>
              {createRecurring.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
