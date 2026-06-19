import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2 } from "lucide-react";
import { useSettings, useUpdateSetting } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";

type PromptKey = "content_prompt" | "image_prompt";

const PROMPTS: {
  key: PromptKey;
  title: string;
  description: string;
  tokens: string[];
}[] = [
  {
    key: "content_prompt",
    title: "Content prompt",
    description: "Wordt gebruikt om de tekst van social posts te genereren.",
    tokens: [
      "[PLATFORM]", "[CONTENT_FORMAT]", "[CLIENT]", "[DOELGROEP]", "[TONE]",
      "[BRANDING]", "[THEME]", "[HOOK]", "[HASHTAGS]", "[CTA_URL]",
      "[READ_URL]", "[LEAD_MAGNET]",
    ],
  },
  {
    key: "image_prompt",
    title: "Image prompt",
    description: "Wordt gebruikt om beelden bij posts te genereren.",
    tokens: ["[HOOK]", "[THEME]", "[PLATFORM]"],
  },
];

export default function InstellingenPrompts() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [values, setValues] = useState<Record<PromptKey, string>>({
    content_prompt: "",
    image_prompt: "",
  });
  const [savingKey, setSavingKey] = useState<PromptKey | null>(null);

  useEffect(() => {
    if (settings) {
      setValues({
        content_prompt: settings.content_prompt ?? "",
        image_prompt: settings.image_prompt ?? "",
      });
    }
  }, [settings]);

  const handleSave = async (key: PromptKey) => {
    setSavingKey(key);
    try {
      await updateSetting.mutateAsync({ key, value: values[key] });
      toast({ title: "Prompt opgeslagen", description: `${key} is bijgewerkt.` });
    } catch (err) {
      toast({
        title: "Opslaan mislukt",
        description: err instanceof Error ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prompts</h1>
        <p className="text-muted-foreground">
          Bewerk de AI-prompts die Kestra gebruikt voor het genereren van posts en beelden.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        PROMPTS.map((p) => (
          <Card key={p.key}>
            <CardHeader>
              <CardTitle className="text-lg">{p.title}</CardTitle>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={values[p.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
                rows={14}
                className="font-mono text-sm leading-relaxed"
                placeholder={`Schrijf hier de ${p.title.toLowerCase()}...`}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Beschikbare tokens:</span>
                {p.tokens.map((t) => (
                  <Badge key={t} variant="secondary" className="font-mono text-[11px]">{t}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Deze tokens worden bij generatie automatisch ingevuld. Je mag de tekst vrij bewerken; er wordt niet gecontroleerd op tokens.
              </p>
              <div className="flex justify-end">
                <Button onClick={() => handleSave(p.key)} disabled={savingKey === p.key}>
                  {savingKey === p.key ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Opslaan
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
