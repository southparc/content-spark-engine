import { supabase } from "@/integrations/supabase/client";

export interface TopicDraft {
  hook: string;
  platform: "linkedin" | "x" | "instagram";
}

type JsonRecord = Record<string, unknown>;

function isObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePlatform(value: unknown): "linkedin" | "x" | "instagram" {
  const platform = typeof value === "string" ? value.toLowerCase() : "linkedin";
  if (platform === "twitter") return "x";
  if (platform === "instagram" || platform === "x" || platform === "linkedin") return platform;
  return "linkedin";
}

function normalizeTopic(item: unknown): TopicDraft | null {
  if (typeof item === "string" && item.trim()) {
    return { hook: item.trim(), platform: "linkedin" };
  }
  if (!isObject(item)) return null;
  const hook = [item.hook, item.title, item.text, item.topic].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  if (!hook) return null;
  return { hook, platform: normalizePlatform(item.platform) };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Onbekende fout tijdens het aanroepen van de service.";
}

// Roept een webhook/endpoint aan via de Supabase webhook-proxy.
// De endpoints zijn Kestra-flows of Supabase edge functions (geen n8n meer).
export async function callWebhook({
  webhookUrl,
  payload,
  allowEmptyResponse = false,
}: {
  webhookUrl: string;
  payload: Record<string, unknown>;
  allowEmptyResponse?: boolean;
}): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("webhook-proxy", {
    body: { webhook_url: webhookUrl, payload },
  });

  if (error) {
    throw new Error(error.message || `Webhook-proxy gaf een fout`);
  }

  if (!data && !allowEmptyResponse) {
    throw new Error("De service gaf een lege response terug.");
  }

  return data;
}

export function parseTopicsResponse(value: unknown): TopicDraft[] {
  const candidates: unknown[] = [value];
  if (isObject(value)) {
    candidates.push(value.topics, value.items, value.data, value.result, value.response, value.output);
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const items = Array.isArray(candidate)
      ? candidate
      : isObject(candidate) && Array.isArray(candidate.topics)
        ? candidate.topics
        : null;
    if (!items) continue;
    const topics = items.map(normalizeTopic).filter((topic): topic is TopicDraft => topic !== null);
    if (topics.length > 0) return topics;
  }
  throw new Error('Geen topics terug. Verwacht {"topics":[{"hook":"...","platform":"linkedin"}]}.');
}

export function parseContentResponse(value: unknown): string {
  const queue: unknown[] = [value];
  const visited = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    if (typeof current === "string" && current.trim()) return current.trim();
    if (Array.isArray(current)) { for (const item of current) queue.push(item); continue; }
    if (!isObject(current)) continue;
    for (const key of ["content", "text", "generated_content", "caption", "post"] as const) {
      const candidate = current[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    for (const key of ["data", "result", "response", "output", "body"] as const) {
      if (key in current) queue.push(current[key]);
    }
  }
  throw new Error('Geen content terug. Verwacht {"content":"..."}.');
}
