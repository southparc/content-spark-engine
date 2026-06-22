import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2, ImageIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useImageSettings,
  useUpdateImageSettings,
  useChannelFormats,
  useUpsertChannelFormat,
} from "@/hooks/use-marketing-data";
import { IMAGE_PROVIDERS, IMAGE_MODELS, IMAGE_QUALITIES } from "@/lib/image-options";
import { useToast } from "@/hooks/use-toast";

export default function InstellingenBeeld() {
  const { data: settings, isLoading } = useImageSettings();
  const { data: formats } = useChannelFormats();
  const updateSettings = useUpdateImageSettings();
  const upsertFormat = useUpsertChannelFormat();
  const { toast } = useToast();

  const [form, setForm] = useState({
    provider: "openai",
    model: "gpt-image-1",
    quality: "high",
    style_prompt: "",
    negative_prompt: "",
  });
  const [saving, setSaving] = useState(false);
  const [formatDraft, setFormatDraft] = useState<Record<string, { width: number; height: number }>>({});

  useEffect(() => {
    if (settings) {
      setForm({
        provider: settings.provider,
        model: settings.model,
        quality: settings.quality,
        style_prompt: settings.style_prompt,
        negative_prompt: settings.negative_prompt,
      });
    }
  }, [settings?.id]);

  const models = IMAGE_MODELS[form.provider] ?? IMAGE_MODELS.openai;

  const handleProviderChange = (provider: string) => {
    const firstModel = (IMAGE_MODELS[provider] ?? [])[0]?.value ?? "";
    setForm((p) => ({ ...p, provider, model: firstModel }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync(form);
      // Gewijzigde formaten meenemen
      for (const [platform, dim] of Object.entries(formatDraft)) {
        await upsertFormat.mutateAsync({ platform, width: dim.width, height: dim.height });
      }
      setFormatDraft({});
      toast({ title: "Beeld-instellingen opgeslagen" });
    } catch (err) {
      toast({ title: "Opslaan mislukt", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
    setSaving(false);
  };

  const formatValue = (platform: string, key: "width" | "height", fallback: number) =>
    formatDraft[platform]?.[key] ?? fallback;

  const setFormat = (platform: string, key: "width" | "height", value: number, other: number) =>
    setFormatDraft((prev) => ({
      ...prev,
      [platform]: { width: key === "width" ? value : (prev[platform]?.width ?? other), height: key === "height" ? value : (prev[platform]?.height ?? other) },
    }));

  if (isLoading) {
    return <div className="space-y-4 max-w-2xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/instellingen"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Beeld-instellingen</h1>
          <p className="text-muted-foreground">Globale defaults; per klant overschrijfbaar via Klanten → instellingen</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generatie</CardTitle>
          <CardDescription>Provider, model en kwaliteit voor de automatische beeldgeneratie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={handleProviderChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model</Label>
              <Select value={form.model} onValueChange={(v) => setForm((p) => ({ ...p, model: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {models.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kwaliteit</Label>
              <Select value={form.quality} onValueChange={(v) => setForm((p) => ({ ...p, quality: v }))} disabled={form.provider !== "openai"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_QUALITIES.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.provider !== "openai" && <p className="text-[10px] text-muted-foreground mt-1">Alleen voor OpenAI</p>}
            </div>
          </div>
          {form.provider === "replicate" && (
            <p className="text-xs text-muted-foreground">⚠️ Replicate vereist een REPLICATE_API_TOKEN als secret op de edge function.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stijl</CardTitle>
          <CardDescription>Wordt aan elke prompt toegevoegd</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default beeldstijl-prompt</Label>
            <Textarea rows={3} value={form.style_prompt} onChange={(e) => setForm((p) => ({ ...p, style_prompt: e.target.value }))} placeholder="Bijv. clean en professioneel, rustig kleurpalet, conceptuele fotografie..." />
          </div>
          <div>
            <Label>Negative prompt (wat NIET in beeld mag)</Label>
            <Textarea rows={2} value={form.negative_prompt} onChange={(e) => setForm((p) => ({ ...p, negative_prompt: e.target.value }))} placeholder="Bijv. geen tekst, geen logo, geen herkenbare gezichten..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kanaalformaten</CardTitle>
          <CardDescription>Per platform de gewenste pixelmaat. OpenAI rondt af naar het dichtstbijzijnde ondersteunde formaat (portret/liggend/vierkant); Replicate gebruikt de exacte verhouding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(formats ?? []).map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <span className="text-sm text-foreground w-40 shrink-0">{f.platform}</span>
              <Input type="number" className="w-24" value={formatValue(f.platform, "width", f.width)} onChange={(e) => setFormat(f.platform, "width", Number(e.target.value), f.height)} />
              <span className="text-muted-foreground">×</span>
              <Input type="number" className="w-24" value={formatValue(f.platform, "height", f.height)} onChange={(e) => setFormat(f.platform, "height", Number(e.target.value), f.width)} />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Opslaan
      </Button>
    </div>
  );
}
