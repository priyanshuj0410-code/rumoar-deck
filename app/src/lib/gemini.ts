import "server-only";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

export type InlineImage = { mimeType: string; data: string };

/** A conversation turn as the Interactions API models it. */
export type Turn =
  | { role: "user"; text: string; images?: InlineImage[] }
  | { role: "model"; text: string };

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Part = { type: "text"; text: string } | { type: "image"; mime_type: string; data: string };
type Step = { type: string; content?: Part[] };

function toSteps(turns: Turn[]): Step[] {
  return turns.map((turn) => {
    if (turn.role === "model") {
      return { type: "model_output", content: [{ type: "text" as const, text: turn.text }] };
    }
    const content: Part[] = [{ type: "text", text: turn.text }];
    for (const image of turn.images ?? []) {
      content.push({ type: "image", mime_type: image.mimeType, data: image.data });
    }
    return { type: "user_input", content };
  });
}

async function post(body: unknown, timeoutMs: number): Promise<Record<string, unknown>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not configured", 500);

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // A timeout and a dead network are very different problems for whoever debugs this.
    const timedOut = (error as { name?: string }).name === "TimeoutError";
    throw new GeminiError(timedOut ? "timed_out" : `network: ${String(error)}`, timedOut ? 504 : 502);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GeminiError(`gemini returned ${response.status}: ${detail.slice(0, 200)}`, 502);
  }

  return (await response.json()) as Record<string, unknown>;
}

/** Pulls text out of either the convenience field or the final step. */
function readText(json: Record<string, unknown>): string {
  const direct = json.output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const steps = (json.steps ?? []) as Step[];
  for (let i = steps.length - 1; i >= 0; i--) {
    const text = steps[i].content
      ?.filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

/**
 * Text and vision. Images ride along inside a user turn — the same call handles "read
 * this photo and list the garments" and "what should I wear to a Jaipur wedding".
 */
export async function chat(options: {
  system?: string;
  turns: Turn[];
  model?: string;
  thinking?: "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<string> {
  const json = await post(
    {
      model: options.model || TEXT_MODEL,
      ...(options.system ? { system_instruction: options.system } : {}),
      input: toSteps(options.turns),
      // Google recommends thinking_level over temperature/top_p on Gemini 3.
      generation_config: { thinking_level: options.thinking ?? "low" },
    },
    options.timeoutMs ?? 45_000,
  );

  const text = readText(json);
  if (!text) throw new GeminiError("empty completion", 502);
  return text;
}

/** Pulls the incremental text out of one SSE payload, whatever shape it arrives in. */
function readDelta(json: Record<string, unknown>): string {
  const delta = json.delta as { type?: string; text?: string } | undefined;
  if (delta?.text && (!delta.type || delta.type === "text")) return delta.text;

  if (typeof json.text === "string") return json.text;

  const content = (json.content ?? []) as Part[];
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { type: "text"; text: string } => part?.type === "text")
      .map((part) => part.text)
      .join("");
  }
  return "";
}

/**
 * Streaming text. Yields deltas as they arrive so the UI has something to show within a
 * second or two instead of a progress bar over a 20-second silence.
 */
export async function* streamChat(options: {
  system?: string;
  turns: Turn[];
  model?: string;
  thinking?: "low" | "medium" | "high";
  timeoutMs?: number;
}): AsyncGenerator<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not configured", 500);

  const response = await fetch(`${ENDPOINT}?alt=sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model: options.model || TEXT_MODEL,
      ...(options.system ? { system_instruction: options.system } : {}),
      input: toSteps(options.turns),
      generation_config: { thinking_level: options.thinking ?? "low" },
      stream: true,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 55_000),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new GeminiError(`gemini returned ${response.status}: ${detail.slice(0, 200)}`, 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // SSE events are separated by a blank line; keep the trailing partial event.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const text = readDelta(JSON.parse(payload) as Record<string, unknown>);
          if (text) yield text;
        } catch {
          // A malformed frame is not worth killing a live generation over.
        }
      }
    }
  }
}

/**
 * Image generation and editing (Nano Banana). Pass `images` to edit rather than create —
 * that is how "put this sling on this man" works: his photo plus the product shot.
 */
export async function generateImage(options: {
  prompt: string;
  images?: InlineImage[];
  aspectRatio?: "1:1" | "3:4" | "4:5" | "9:16" | "16:9";
  size?: "1K" | "2K" | "4K";
  timeoutMs?: number;
}): Promise<InlineImage> {
  const content: Part[] = [{ type: "text", text: options.prompt }];
  for (const image of options.images ?? []) {
    content.push({ type: "image", mime_type: image.mimeType, data: image.data });
  }

  const json = await post(
    {
      model: IMAGE_MODEL,
      input: [{ type: "user_input", content }],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: options.aspectRatio ?? "3:4",
        image_size: options.size ?? "1K",
      },
    },
    // Image generation is slower than text. Kept under Vercel's 60s function ceiling so
    // the request fails with our own error rather than the platform's.
    options.timeoutMs ?? 55_000,
  );

  const direct = json.output_image as InlineImage | { data?: string; mime_type?: string } | undefined;
  if (direct && typeof direct === "object" && "data" in direct && direct.data) {
    return {
      data: direct.data as string,
      mimeType: (direct as { mime_type?: string }).mime_type ?? "image/jpeg",
    };
  }

  for (const step of (json.steps ?? []) as Step[]) {
    const image = step.content?.find((part): part is Extract<Part, { type: "image" }> => part.type === "image");
    if (image?.data) return { data: image.data, mimeType: image.mime_type ?? "image/jpeg" };
  }

  throw new GeminiError("no image in response", 502);
}

/** Strips a data: prefix if present — callers pass either raw base64 or a data URL. */
export function toInline(dataUrl: string, fallbackMime = "image/jpeg"): InlineImage {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: fallbackMime, data: dataUrl };
}
