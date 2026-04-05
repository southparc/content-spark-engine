export interface N8nTopicDraft {
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

function normalizeTopic(item: unknown): N8nTopicDraft | null {
  if (typeof item === "string" && item.trim()) {
    return { hook: item.trim(), platform: "linkedin" };
  }

  if (!isObject(item)) return null;

  const hook = [item.hook, item.title, item.text, item.topic].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  if (!hook) return null;

  return {
    hook,
    platform: normalizePlatform(item.platform),
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Onbekende fout tijdens het aanroepen van n8n.";
}

export async function invokeN8nWebhook({
  webhookUrl,
  payload,
  allowEmptyResponse = false,
}: {
  webhookUrl: string;
  payload: Record<string, unknown>;
  allowEmptyResponse?: boolean;
}): Promise<unknown> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(raw.trim() || `Webhook gaf status ${response.status}`);
  }

  if (!raw.trim()) {
    if (allowEmptyResponse) return null;

    throw new Error(
      'n8n gaf een lege response terug. Voeg op dit pad een "Respond to Webhook" node toe die JSON terugstuurt.',
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function parseTopicsResponse(value: unknown): N8nTopicDraft[] {
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

    const topics = items.map(normalizeTopic).filter((topic): topic is N8nTopicDraft => topic !== null);
    if (topics.length > 0) return topics;
  }

  throw new Error(
    'n8n gaf geen topics terug. Verwacht bijvoorbeeld {"topics":[{"hook":"...","platform":"linkedin"}]}.',
  );
}

export function parseContentResponse(value: unknown): string {
  const queue: unknown[] = [value];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (!isObject(current)) continue;

    for (const key of ["content", "text", "generated_content", "caption", "post"] as const) {
      const candidate = current[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    for (const key of ["data", "result", "response", "output", "body"] as const) {
      if (key in current) queue.push(current[key]);
    }
  }

  throw new Error(
    'n8n gaf geen content terug. Verwacht bijvoorbeeld {"content":"..."} uit de "Respond to Webhook" node.',
  );
}