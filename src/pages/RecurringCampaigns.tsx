import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Plus, Trash2, Clock, Zap, Loader2 } from "lucide-react";
import {
  useClients,
  useRecurringCampaigns,
  useCreateRecurringCampaign,
  useUpdateRecurringCampaign,
  useDeleteRecurringCampaign,
  type MmRecurringCampaign,
} from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";
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

// Slots van de n8n-workflow "MM Scheduler v3": 08:30, 11:00, 13:30, 16:00, 19:30.
// LinkedIn post in slot 2 (11:00), Instagram in slot 4 (16:00), X vult slots vanaf 08:30.
const PLATFORM_LABELS: Record<string, string> = { x: "X", linkedin: "LinkedIn", instagram: "Instagram" };

function scheduleSummary(c: MmRecurringCampaign): string {
  const s = c.platform_schedule || { x_per_day: 0, linkedin_per_week: 0, instagram_per_week: 0 };
  const parts: string[] = [];
  if ((c.platforms || []).includes("x") && s.x_per_day > 0) parts.push(`X ${s.x_per_day}x/dag`);
  if ((c.platforms || []).includes("linkedin") && s.linkedin_per_week > 0) parts.push(`LinkedIn ${s.linkedin_per_week}x/wk`);
  if ((c.platforms || []).includes("instagram") && s.instagram_per_week > 0) parts.push(`Insta ${s.instagram_per_week}x/wk`);
  return parts.join(" · ") || "geen schema";
}

export default function RecurringCampaigns() {
  const { data: clients } = useClients();
  const { data: campaigns, isLoading } = useRecurringCampaigns();
  const createRecurring = useCreateRecurringCampaign();
  const updateRecurring = useUpdateRecurringCampaign();
  const deleteRecurring = useDeleteRecurringCampaign();
  const { toast } = useToast();
  const { activeClientId } = useActiveClient();

  const shownCampaigns = activeClientId === ALL_CLIENTS ? campaigns : campaigns?.filter((c) => c.client_id === activeClientId);

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    theme: "",
    onderwerp: "",
    keywordsText: "",
    x_per_day: 5,
    linkedin_per_week: 5,
    instagram_per_week: 3,
  });

  const resetForm = () =>
    setForm({ client_id: "", theme: "", onderwerp: "", keywordsText: "", x_per_day: 5, linkedin_per_week: 5, instagram_per_week: 3 });

  const handleCreate = async () => {
    if (!form.client_id || !form.theme.trim()) {
      toast({ title: "Kies een klant en vul minimaal een thema in", variant: "destructive" });
      return;
    }
    const keywords = form.keywordsText
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);
    const platforms: string[] = [];
    if (form.x_per_day > 0) platforms.push("x");
    if (form.linkedin_per_week > 0) platforms.push("linkedin");
    if (form.instagram_per_week > 0) platforms.push("instagram");
    if (platforms.length === 0) {
      toast({ title: "Zet minimaal één platform op een aantal boven 0", variant: "destructive" });
      return;
    }
    try {
      await createRecurring.mutateAsync({
        client_id: form.client_id,
        theme: form.theme,
        onderwerp: form.onderwerp,
        keyword: keywords[0] || "",
        keywords,
        platforms,
        platform_schedule: {
          x_per_day: form.x_per_day,
          linkedin_per_week: form.linkedin_per_week,
          instagram_per_week: form.instagram_per_week,
        },
        auto_platforms: [],
        frequency_per_week: 3,
        auto_publish: false,
      });
      setShowDialog(false);
      resetForm();
      toast({ title: "Recurring campagne actief! 🔄", description: "De scheduler pakt hem in het eerstvolgende tijdslot op." });
    } catch (err) {
      toast({ title: "Aanmaken mislukt", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const toggleAutoPlatform = (c: MmRecurringCampaign, platform: string) => {
    const current = c.auto_platforms || [];
    const next = current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform];
    updateRecurring.mutate({ id: c.id, auto_platforms: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring Campaigns</h1>
          <p className="text-muted-foreground">Vijf tijdslots per dag (08:30 · 11:00 · 13:30 · 16:00 · 19:30), per platform een eigen ritme</p>
        </div>
        <Button onClick={() => { setForm((f) => ({ ...f, client_id: activeClientId === ALL_CLIENTS ? "" : activeClientId })); setShowDialog(true); }} className="gradient-primary border-0 text-primary-foreground hover:opacity-90">
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

      {!isLoading && (shownCampaigns?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nog geen recurring campagnes.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {shownCampaigns?.map((c) => {
          const client = clients?.find((cl) => cl.id === c.client_id);
          const keywords = c.keywords || [];
          const nextKeyword = keywords.length ? keywords[(c.keyword_index || 0) % keywords.length] : c.keyword;
          return (
            <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <RefreshCw className={`h-5 w-5 text-primary ${c.active ? "animate-spin-slow" : ""}`} style={{ animationDuration: "8s" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{c.theme}</p>
                      <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Actief" : "Gepauzeerd"}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{client?.name || "Onbekende klant"}</span>
                      {c.onderwerp && <span>· {c.onderwerp}</span>}
                      <span className="font-medium">{scheduleSummary(c)}</span>
                      {c.last_run_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(c.last_run_at).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch checked={c.active} onCheckedChange={(v) => updateRecurring.mutate({ id: c.id, active: v })} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => { deleteRecurring.mutate(c.id); toast({ title: "Campagne verwijderd" }); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Auto-publish:</span>
                  {(c.platforms || []).map((p) => (
                    <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                      <Switch
                        checked={(c.auto_platforms || []).includes(p)}
                        onCheckedChange={() => toggleAutoPlatform(c, p)}
                      />
                      <span className={(c.auto_platforms || []).includes(p) ? "text-foreground font-medium" : "text-muted-foreground"}>
                        {PLATFORM_LABELS[p] || p}
                      </span>
                    </label>
                  ))}
                </div>

                {keywords.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">🔑</span>
                    {keywords.map((k, i) => (
                      <Badge key={i} variant={k === nextKeyword ? "default" : "outline"} className="text-[10px] font-normal">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hoe werkt het?</CardTitle>
          <CardDescription>De scheduler draait vijf keer per dag en gebruikt eerst je hook-voorraad</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
            <p>Vul thema, onderwerp en ~10 keywords (invalshoeken). Genereer optioneel alvast hooks via Campagne — die voorraad wordt eerst gebruikt.</p>
          </div>
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
            <p>X post tot 5x per dag (gespreid over de slots), LinkedIn max 1x per dag om 11:00, Instagram om 16:00 op vaste dagen.</p>
          </div>
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span>
            <p>Is de voorraad leeg, dan genereert de scheduler zelf — roterend over je keywords, met actualiteit en een vermijdlijst van recente posts.</p>
          </div>
          <div className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">4</span>
            <p>Auto-publish per platform: aan = direct via Buffer live, uit = eerst langs Goedkeuring. Tip: zet X pas op auto na een week meelezen.</p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nieuwe recurring campagne</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
              <Label>Keywords / invalshoeken (één per regel of kommagescheiden, ~10)</Label>
              <Textarea
                value={form.keywordsText}
                onChange={(e) => setForm((p) => ({ ...p, keywordsText: e.target.value }))}
                placeholder={"ai hypotheekadvies\ngespreksverslag automatiseren\ncompliance en avg bij ai"}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>X per dag</Label>
                <Select value={String(form.x_per_day)} onValueChange={(v) => setForm((p) => ({ ...p, x_per_day: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>LinkedIn p/week</Label>
                <Select value={String(form.linkedin_per_week)} onValueChange={(v) => setForm((p) => ({ ...p, linkedin_per_week: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Insta p/week</Label>
                <Select value={String(form.instagram_per_week)} onValueChange={(v) => setForm((p) => ({ ...p, instagram_per_week: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Auto-publish staat standaard uit; zet het per platform aan op de campagnekaart zodra je de kwaliteit vertrouwt.</p>
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
