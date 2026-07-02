import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Loader2, ImageIcon, ChevronRight, Cpu } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useSettings, useUpdateSetting } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";

export default function Instellingen() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [local, setLocal] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const update = (key: string, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(local)) {
        if (settings && settings[key] !== value) {
          await updateSetting.mutateAsync({ key, value });
        }
      }
      toast({ title: "Instellingen opgeslagen" });
    } catch {
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Instellingen</h1>
        <p className="text-muted-foreground">Webhooks, integraties en automatisering</p>
      </div>

      <Link to="/instellingen/beeld">
        <Card className="hover:bg-accent/40 transition-colors">
          <CardContent className="flex items-center gap-3 py-4 px-4">
            <ImageIcon className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Beeld-instellingen</p>
              <p className="text-xs text-muted-foreground">Provider, model, stijl-prompt en kanaalformaten voor de beeldgeneratie</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> Tekstmodel</CardTitle>
          <CardDescription>Het AI-model voor onderwerpen, posts en de redactie-check. Geldt voor alle klanten.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={local.text_model || "gpt-4.1"} onValueChange={(v) => update("text_model", v)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4.1">gpt-4.1 — beste kwaliteit (aanbevolen)</SelectItem>
              <SelectItem value="gpt-4.1-mini">gpt-4.1-mini — sneller en goedkoper</SelectItem>
              <SelectItem value="gpt-4o">gpt-4o — vorige standaard</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endpoints</CardTitle>
          <CardDescription>
            Content-generatie draait op Supabase edge functions; publicatie loopt via een Kestra-flow.
            Deze URL's staan normaal goed — alleen aanpassen als een endpoint verhuist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Topics genereren (edge function)</Label>
            <Input value={local.webhook_generate_topics ?? ""} onChange={(e) => update("webhook_generate_topics", e.target.value)} placeholder="https://<project>.supabase.co/functions/v1/generate-topics" />
          </div>
          <div>
            <Label>Content genereren (edge function)</Label>
            <Input value={local.webhook_generate_content ?? ""} onChange={(e) => update("webhook_generate_content", e.target.value)} placeholder="https://<project>.supabase.co/functions/v1/generate-content" />
          </div>
          <div>
            <Label>Longread genereren (edge function)</Label>
            <Input value={local.webhook_generate_longread ?? ""} onChange={(e) => update("webhook_generate_longread", e.target.value)} placeholder="https://<project>.supabase.co/functions/v1/generate-longread" />
          </div>
          <div>
            <Label>Trends ophalen (edge function)</Label>
            <Input value={local.webhook_trending_topics ?? ""} onChange={(e) => update("webhook_trending_topics", e.target.value)} placeholder="https://<project>.supabase.co/functions/v1/generate-trends" />
          </div>
          <div>
            <Label>Posten naar Buffer (Kestra-flow)</Label>
            <Input value={local.webhook_post ?? ""} onChange={(e) => update("webhook_post", e.target.value)} placeholder="https://flow.southparc.nl/api/v1/executions/webhook/southparc.mm/post-to-buffer/..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buffer Channel IDs</CardTitle>
          <CardDescription>De Buffer channel-ID per platform die gebruikt wordt voor publicatie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Buffer profile ID</Label>
            <Input value={local.buffer_profile_id ?? ""} onChange={(e) => update("buffer_profile_id", e.target.value)} placeholder="bv. 5f8a..." />
          </div>
          <div>
            <Label>LinkedIn channel ID</Label>
            <Input value={local.buffer_channel_linkedin ?? ""} onChange={(e) => update("buffer_channel_linkedin", e.target.value)} placeholder="bv. 5f8a..." />
          </div>
          <div>
            <Label>X (Twitter) channel ID</Label>
            <Input value={local.buffer_channel_x ?? ""} onChange={(e) => update("buffer_channel_x", e.target.value)} placeholder="bv. 5f8a..." />
          </div>
          <div>
            <Label>Instagram channel ID</Label>
            <Input value={local.buffer_channel_instagram ?? ""} onChange={(e) => update("buffer_channel_instagram", e.target.value)} placeholder="bv. 5f8a..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Creatomate</CardTitle>
          <CardDescription>Video & carousel rendering</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label>API Key</Label>
            <Input type="password" value={local.creatomate_api_key ?? ""} onChange={(e) => update("creatomate_api_key", e.target.value)} placeholder="Jouw Creatomate API key" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automatisering</CardTitle>
          <CardDescription>Instellingen voor automatische runs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-approve</p>
              <p className="text-xs text-muted-foreground">Sla de review-stap over en post direct na generatie</p>
            </div>
            <Switch checked={local.auto_approve === "true"} onCheckedChange={(v) => update("auto_approve", v ? "true" : "false")} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Opslaan
      </Button>
    </div>
  );
}
