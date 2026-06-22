import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Vrije waarde van klant wint; anders globale default; anders hardcoded fallback.
function pick(clientVal: unknown, globalVal: unknown, fallback: string): string {
  const c = typeof clientVal === "string" ? clientVal.trim() : "";
  if (c) return c;
  const g = typeof globalVal === "string" ? globalVal.trim() : "";
  if (g) return g;
  return fallback;
}

// OpenAI gpt-image-* ondersteunt alleen 1024x1024 / 1024x1536 / 1536x1024.
function openaiSize(w: number, h: number): string {
  const r = w / h;
  if (r > 1.2) return "1536x1024";
  if (r < 0.83) return "1024x1536";
  return "1024x1024";
}

// width/height -> dichtstbijzijnde gangbare aspect-ratio string voor Replicate.
function aspectRatio(w: number, h: number): string {
  const r = w / h;
  const opts: [string, number][] = [["1:1", 1], ["4:5", 0.8], ["2:3", 0.667], ["9:16", 0.5625], ["3:2", 1.5], ["16:9", 1.778]];
  let best = opts[0];
  for (const o of opts) if (Math.abs(o[1] - r) < Math.abs(best[1] - r)) best = o;
  return best[0];
}

// Friendly modelnamen -> Replicate owner/name slugs. Een waarde met "/" wordt
// ongewijzigd als slug gebruikt, zodat exacte slugs altijd te overrulen zijn.
const REPLICATE_SLUGS: Record<string, string> = {
  "flux.2-pro": "black-forest-labs/flux-2-pro",
  "ideogram-v3": "ideogram-ai/ideogram-v3-turbo",
  "recraft-v4-pro": "recraft-ai/recraft-v3",
  "seedream-v5-lite": "bytedance/seedream-3",
};

async function genOpenAI(model: string, quality: string, size: string, prompt: string): Promise<Uint8Array> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY secret ontbreekt op de edge function.");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI: ${data?.error?.message || res.status}`);
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI gaf geen beelddata terug.");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function genReplicate(model: string, prompt: string, ar: string, seed: number | null): Promise<Uint8Array> {
  const key = Deno.env.get("REPLICATE_API_TOKEN");
  if (!key) throw new Error("REPLICATE_API_TOKEN secret ontbreekt op de edge function.");
  const slug = model.includes("/") ? model : (REPLICATE_SLUGS[model] || model);
  const input: Record<string, unknown> = { prompt, aspect_ratio: ar };
  if (seed != null) input.seed = seed;
  const start = await fetch(`https://api.replicate.com/v1/models/${slug}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input }),
  });
  let pred = await start.json();
  if (!start.ok) throw new Error(`Replicate (${slug}): ${pred?.detail || pred?.title || start.status}`);
  // Pollen als 'wait' niet meteen een terminale status gaf.
  let tries = 0;
  while (pred.status && pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled" && tries < 60) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${key}` } });
    pred = await poll.json();
    tries++;
  }
  if (pred.status !== "succeeded") throw new Error(`Replicate (${slug}) status: ${pred.status} ${pred.error || ""}`);
  const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!out || typeof out !== "string") throw new Error("Replicate gaf geen beeld-URL terug.");
  const img = await fetch(out);
  return new Uint8Array(await img.arrayBuffer());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json();
    const payload = body?.body ?? body; // accepteert zowel {..} als n8n-stijl {body:{..}}
    const clientId: string | undefined = payload.client_id;
    const hook: string = payload.hook || payload.campaign_theme || "zakelijk concept";
    const platform: string = (payload.platform || "default").toLowerCase();

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: globalRow } = await supabase.from("mm_image_settings").select("*").eq("id", "global").maybeSingle();
    const g = globalRow || {};

    let client: Record<string, unknown> = {};
    if (clientId) {
      const { data: c } = await supabase.from("mm_clients").select("*").eq("id", clientId).maybeSingle();
      client = c || {};
    }

    const provider = pick(client.img_provider, g.provider, "openai");
    const model = pick(client.img_model, g.model, provider === "replicate" ? "flux.2-pro" : "gpt-image-1");
    const quality = pick(client.img_quality, g.quality, "high");
    const style = pick(client.img_style_prompt, g.style_prompt, "clean en professioneel, rustig kleurpalet");
    const negative = pick(client.img_negative_prompt, g.negative_prompt, "geen tekst, geen logo");
    const seed = typeof client.img_seed === "number" ? client.img_seed : null;
    const colors = Array.isArray(client.brand_colors) ? (client.brand_colors as string[]) : [];

    const { data: fmtRow } = await supabase.from("mm_channel_formats").select("*").eq("platform", platform).maybeSingle();
    const { data: defRow } = fmtRow ? { data: fmtRow } : await supabase.from("mm_channel_formats").select("*").eq("platform", "default").maybeSingle();
    const width = (defRow?.width as number) || 1080;
    const height = (defRow?.height as number) || 1080;

    const colorLine = colors.length ? ` Verwerk subtiel deze merkkleuren: ${colors.join(", ")}.` : "";
    const prompt = `Modern redactioneel beeld voor een zakelijke social media post over: ${hook}. Stijl: ${style}.${colorLine} Vermijd: ${negative}.`;

    let bytes: Uint8Array;
    if (provider === "replicate") {
      bytes = await genReplicate(model, prompt, aspectRatio(width, height), seed);
    } else {
      bytes = await genOpenAI(model, quality, openaiSize(width, height), prompt);
    }

    const fileName = `mm-${Date.now()}-${platform}.png`;
    const { error: upErr } = await supabase.storage.from("mm-media").upload(fileName, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`Upload mislukt: ${upErr.message}`);
    const { data: pub } = supabase.storage.from("mm-media").getPublicUrl(fileName);

    return json({ media_url: pub.publicUrl, provider, model, size: `${width}x${height}` });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
