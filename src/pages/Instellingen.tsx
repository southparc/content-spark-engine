import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, ExternalLink, Loader2 } from "lucide-react";
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
        <p className="text-muted-foreground">Configureer je n8n webhooks en API keys</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">n8n Webhook URLs</CardTitle>
          <CardDescription>
            Voer de Production webhook URLs in van je n8n workflows.{" "}
            <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
              Documentatie <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>n8n Base URL</Label>
            <Input value={local.n8n_base_url ?? ""} onChange={(e) => update("n8n_base_url", e.target.value)} placeholder="https://jouw-n8n.app.n8n.cloud" />
          </div>
          <div>
            <Label>Webhook: Topics genereren</Label>
            <Input value={local.webhook_generate_topics ?? ""} onChange={(e) => update("webhook_generate_topics", e.target.value)} placeholder="https://jouw-n8n.../webhook/generate-topics" />
          </div>
          <div>
            <Label>Webhook: Content genereren</Label>
            <Input value={local.webhook_generate_content ?? ""} onChange={(e) => update("webhook_generate_content", e.target.value)} placeholder="https://jouw-n8n.../webhook/generate-content" />
          </div>
          <div>
            <Label>Webhook: Posten</Label>
            <Input value={local.webhook_post ?? ""} onChange={(e) => update("webhook_post", e.target.value)} placeholder="https://jouw-n8n.../webhook/post" />
          </div>
          <div>
            <Label>Webhook: Trending topics</Label>
            <Input value={local.webhook_trending_topics ?? ""} onChange={(e) => update("webhook_trending_topics", e.target.value)} placeholder="https://jouw-n8n.../webhook/trending-topics" />
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
