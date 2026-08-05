import "server-only";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

/**
 * An image route must run on an image model. A text model given an image-editing prompt
 * does not error — it politely describes the picture it would have made and returns
 * `status: completed` with a text part, which is indistinguishable from success until you
 * go looking for the bytes. So a misconfigured override is ignored rather than obeyed.
 */
function resolveImageModel(): string {
  const configured = process.env.GEMINI_IMAGE_MODEL?.trim();
  if (!configured) return DEFAULT_IMAGE_MODEL;
  if (!/image/i.test(configured)) {
    console.error(
      `[gemini] GEMINI_IMAGE_MODEL="${configured}" is not an image model; using ${DEFAULT_IMAGE_MODEL}`,
    );
    return DEFAULT_IMAGE_MODEL;
  }
  return configured;
}

export const IMAGE_MODEL = resolveImageModel();

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
    // Logged in full server-side; the caller only ever forwards a truncated reason.
    console.error("[gemini] upstream error", response.status, detail.slice(0, 800));
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

/**
 * Walks the response for image bytes instead of assuming a path.
 *
 * The Interactions API, the legacy generateContent API and their SDKs each nest image
 * data differently (`output_image`, `steps[].content[]`, `inline_data`, `inlineData`).
 * Enumerating those shapes is how this broke twice, so it now searches for the thing
 * itself: a long base64 string carrying an image mime type.
 */
type ImageRef = { kind: "inline"; data: string; mimeType: string } | { kind: "uri"; uri: string; mimeType: string };

const URI_KEYS = ["file_uri", "fileUri", "image_url", "imageUrl", "uri", "url"] as const;

function findImage(node: unknown, depth = 0): ImageRef | null {
  if (node === null || node === undefined || depth > 8) return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findImage(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  const mime = (obj.mime_type ?? obj.mimeType) as string | undefined;
  const mimeIsImage = typeof mime !== "string" || mime.startsWith("image/");

  const data = (obj.data ?? obj.b64_json ?? obj.bytes_base64) as unknown;
  if (typeof data === "string" && data.length > 512 && mimeIsImage) {
    return { kind: "inline", data, mimeType: typeof mime === "string" ? mime : "image/jpeg" };
  }

  // Some responses hand back a short-lived URI instead of inline bytes.
  if (mimeIsImage) {
    for (const key of URI_KEYS) {
      const value = obj[key];
      if (typeof value === "string" && /^https?:\/\//.test(value)) {
        return { kind: "uri", uri: value, mimeType: typeof mime === "string" ? mime : "image/jpeg" };
      }
    }
  }

  for (const value of Object.values(obj)) {
    const found = findImage(value, depth + 1);
    if (found) return found;
  }
  return null;
}

// A 1K JPEG is ~40KB of base64 at the absolute minimum. Thought signatures and ids are
// orders of magnitude shorter, so this threshold separates image bytes from every other
// long-ish string in the response without needing to know the key name.
const MIN_IMAGE_B64 = 20_000;
const NOT_IMAGE_KEYS = /signature|token|^id$|trace|cache/i;

/**
 * Last resort: find image bytes by their shape rather than their key.
 *
 * Three separate fixes here failed because I kept predicting where the API puts the
 * image. This looks for what an image actually is — a very long base64 string — and is
 * deliberately conservative about what it will accept.
 */
function findLooseBase64(node: unknown, depth = 0): string | null {
  if (node === null || node === undefined || depth > 8) return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findLooseBase64(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof node !== "object") return null;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (
      typeof value === "string" &&
      value.length > MIN_IMAGE_B64 &&
      !NOT_IMAGE_KEYS.test(key) &&
      /^[A-Za-z0-9+/\r\n=_-]+$/.test(value.slice(0, 512))
    ) {
      return value;
    }
    const found = findLooseBase64(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Re-fetches an interaction by id, in case the image arrives after the create call. */
async function retrieve(id: string): Promise<Record<string, unknown> | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  // A little breathing room in case generation is still finishing server-side.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
}

/** Downloads a URI-delivered image and returns it as inline bytes. */
async function resolveImage(ref: ImageRef): Promise<InlineImage> {
  if (ref.kind === "inline") return { data: ref.data, mimeType: ref.mimeType };

  const key = process.env.GEMINI_API_KEY;
  const response = await fetch(ref.uri, {
    headers: key ? { "x-goog-api-key": key } : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new GeminiError(`image fetch returned ${response.status}`, 502);

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    data: buffer.toString("base64"),
    mimeType: response.headers.get("content-type") ?? ref.mimeType,
  };
}

/**
 * Structure only — keys and types, never values. Safe to log.
 *
 * Describes every array element, not just the first: the previous version hid the image
 * step behind an ellipsis because it only ever showed `steps[0]`.
 */
function describe(node: unknown, depth = 0): string {
  if (node === null) return "null";
  if (Array.isArray(node)) {
    if (depth > 5) return "[…]";
    const shown = node.slice(0, 4).map((child) => describe(child, depth + 1));
    return `[${shown.join(", ")}${node.length > 4 ? `, …+${node.length - 4}` : ""}]`;
  }
  if (typeof node === "object") {
    if (depth > 5) return "{…}";
    return `{${Object.entries(node as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${describe(value, depth + 1)}`)
      .join(", ")}}`;
  }
  if (typeof node === "string") return `string(${node.length})`;
  return typeof node;
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
      // Image generation takes a flat array of parts, NOT the {type:"user_input",content}
      // step wrapper that multi-turn text uses. Wrapping it here returns a 400.
      input: content,
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

  const found = findImage(json);
  if (found) return resolveImage(found);

  const loose = findLooseBase64(json);
  if (loose) return { data: loose, mimeType: "image/jpeg" };

  // The response is an interaction resource with an id and a status, so the remaining
  // possibility is that the bytes land on a follow-up retrieval rather than in the
  // create response. One bounded retry, then give up honestly.
  const id = typeof json.id === "string" ? json.id : null;
  if (id) {
    const retrieved = await retrieve(id).catch(() => null);
    if (retrieved) {
      const late = findImage(retrieved);
      if (late) return resolveImage(late);
      const lateLoose = findLooseBase64(retrieved);
      if (lateLoose) return { data: lateLoose, mimeType: "image/jpeg" };
      console.error("[gemini] retrieval had no image either;", describe(retrieved).slice(0, 1500));
    }
  }

  // No image anywhere. Report the part that matters — the status and the step tree —
  // rather than a full dump whose informative tail gets truncated away. `usage` and `id`
  // told us nothing and ate the whole budget twice.
  const status = typeof json.status === "string" ? json.status : "?";
  // The model that actually ran. A text model here is the whole bug, and its name is the
  // one value in this response that would have identified it immediately.
  const ran = typeof json.model === "string" ? json.model : "?";
  const said = readText(json).slice(0, 200);
  const steps = json.steps ? describe(json.steps) : describe(json);
  const shape =
    `requested=${IMAGE_MODEL} ran=${ran} status=${status} steps=${steps}` +
    (said ? ` said="${said}"` : "");

  console.error("[gemini] no image in response;", shape);
  throw new GeminiError(`no image found. ${shape}`.slice(0, 4000), 502);
}

/** Strips a data: prefix if present — callers pass either raw base64 or a data URL. */
export function toInline(dataUrl: string, fallbackMime = "image/jpeg"): InlineImage {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: fallbackMime, data: dataUrl };
}
