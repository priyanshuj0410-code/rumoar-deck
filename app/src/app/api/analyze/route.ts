import { createClient } from "@/lib/supabase/server";
import { chat, streamChat, TEXT_MODEL, type InlineImage } from "@/lib/gemini";
import { encodeEvent } from "@/lib/ndjson";
import type { ColourAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEASONS = [
  "Light Spring", "Warm Spring", "Clear Spring",
  "Light Summer", "Cool Summer", "Soft Summer",
  "Soft Autumn", "Warm Autumn", "Deep Autumn",
  "Deep Winter", "Cool Winter", "Clear Winter",
];

const MARKER = "---JSON---";

const PROMPT = [
  "You are a professional colour analyst and menswear fit consultant.",
  "You are looking at several photos of the same man, taken front, side and back.",
  "",
  "Work through the three colour dimensions before naming a season:",
  "1. HUE — is his skin undertone warm (golden/peach), cool (pink/blue), neutral, or olive?",
  "2. VALUE — how light or deep is his colouring overall (skin, hair, eyes together)?",
  "3. CHROMA — do his features look soft and blended, or clear and saturated?",
  "Then judge CONTRAST: the gap between his hair, skin and eyes.",
  "",
  `Name the closest of the twelve seasons: ${SEASONS.join(", ")}.`,
  "",
  "Also give practical fit notes from the full-body shots — frame, proportions, and what",
  "cuts and lengths sit well. Clothing fit only. Never comment on weight, attractiveness,",
  "fitness or health, and never guess age, ethnicity or origin.",
  "",
  "OUTPUT IN TWO PARTS.",
  "",
  "PART ONE: four to six short sentences, written to him, second person, no headings and",
  "no lists. Narrate what you are seeing as you work it out — undertone first, then depth,",
  "then contrast, then the season and what it means for what he wears. This part is read",
  "aloud as it streams, so make every sentence land on its own.",
  "",
  `PART TWO: a line containing exactly ${MARKER}, then the JSON object below and nothing else.`,
  JSON.stringify({
    undertone: "warm|cool|neutral|olive",
    depth: "light|medium|deep",
    contrast: "low|medium|high",
    chroma: "soft|muted|clear|bright",
    season: "Deep Autumn",
    season_confidence: 0.72,
    features: { skin: "", hair: "", eyes: "" },
    build: { frame: "", proportions: "", fit_notes: "" },
    best_colours: [{ name: "Deep olive", hex: "#3B4A2F", why: "" }],
    avoid_colours: [{ name: "Icy pastel pink", hex: "#F6D4DF", why: "" }],
    metals: "gold|silver|both",
    notes: "",
    caveat: "",
  }),
  "",
  "6 to 8 best_colours and 3 to 4 avoid_colours, each with a real hex value.",
  "Phone cameras and indoor light shift apparent skin tone — set season_confidence",
  "honestly, and put any lighting problem in `caveat`.",
].join("\n");

const ONE_OF = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

function str(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function swatches(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const hex = str(item.hex, 9);
      return {
        name: str(item.name, 60),
        // A bad hex renders as a black chip and reads as advice; drop it instead.
        hex: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : "",
        why: str(item.why, 200),
      };
    })
    .filter((s) => s.name && s.hex)
    .slice(0, limit);
}

function parse(raw: string): ColourAnalysis | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as Record<string, unknown>;
    const features = (j.features ?? {}) as Record<string, unknown>;
    const build = (j.build ?? {}) as Record<string, unknown>;
    const confidence = Number(j.season_confidence);

    return {
      undertone: ONE_OF(j.undertone, ["warm", "cool", "neutral", "olive"] as const, "neutral"),
      depth: ONE_OF(j.depth, ["light", "medium", "deep"] as const, "medium"),
      contrast: ONE_OF(j.contrast, ["low", "medium", "high"] as const, "medium"),
      chroma: ONE_OF(j.chroma, ["soft", "muted", "clear", "bright"] as const, "muted"),
      season: SEASONS.includes(str(j.season, 40)) ? str(j.season, 40) : "Soft Autumn",
      season_confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
      features: {
        skin: str(features.skin, 200),
        hair: str(features.hair, 200),
        eyes: str(features.eyes, 200),
      },
      build: {
        frame: str(build.frame, 200),
        proportions: str(build.proportions, 200),
        fit_notes: str(build.fit_notes, 400),
      },
      best_colours: swatches(j.best_colours, 8),
      avoid_colours: swatches(j.avoid_colours, 4),
      metals: ONE_OF(j.metals, ["gold", "silver", "both"] as const, "both"),
      notes: str(j.notes, 600),
      caveat: str(j.caveat, 300) || undefined,
    };
  } catch {
    return null;
  }
}

async function download(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
): Promise<InlineImage | null> {
  const { data } = await supabase.storage.from("wardrobe").download(path);
  if (!data) return null;
  return {
    mimeType: data.type || "image/jpeg",
    data: Buffer.from(await data.arrayBuffer()).toString("base64"),
  };
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("not signed in", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("photo_paths")
    .eq("id", user.id)
    .single();

  const paths = ((profile?.photo_paths ?? []) as string[]).slice(0, 6);
  if (paths.length < 3) {
    return new Response(
      JSON.stringify({ t: "error", message: "Add at least three photos first." }) + "\n",
      { status: 409, headers: { "Content-Type": "application/x-ndjson" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Parameters<typeof encodeEvent>[0]) =>
        controller.enqueue(encodeEvent(event));

      try {
        send({ t: "status", v: "Opening your photos" });

        const images = (await Promise.all(paths.map((path) => download(supabase, path)))).filter(
          (image): image is InlineImage => image !== null,
        );

        if (images.length < 3) {
          send({ t: "error", message: "Those photos couldn't be read. Try different ones." });
          controller.close();
          return;
        }

        send({ t: "status", v: "Reading undertone, depth and contrast" });

        const request = {
          turns: [{ role: "user" as const, text: PROMPT, images }],
          model: TEXT_MODEL,
          thinking: "high" as const,
          timeoutMs: 55_000,
        };

        let full = "";
        let emitted = 0;
        let proseDone = false;

        const consume = (delta: string) => {
          full += delta;
          if (proseDone) return;

          // Everything before the marker is for the reader; everything after is data.
          const cut = full.indexOf(MARKER);
          // The marker can arrive split across deltas, so hold back a tail long enough to
          // contain it rather than flashing "---JS" on screen.
          const limit = cut === -1 ? Math.max(emitted, full.length - MARKER.length) : cut;

          if (limit > emitted) {
            send({ t: "text", v: full.slice(emitted, limit) });
            emitted = limit;
          }

          if (cut !== -1) {
            proseDone = true;
            send({ t: "status", v: "Picking your palette" });
          }
        };

        try {
          for await (const delta of streamChat(request)) consume(delta);
        } catch (streamError) {
          if (full) throw streamError;
        }

        // Streaming is an enhancement, not a dependency.
        if (!full.trim()) {
          send({ t: "status", v: "Still working" });
          consume(await chat(request));
        }

        const analysis = parse(full.slice(full.indexOf(MARKER) + MARKER.length) || full);
        if (!analysis) {
          send({ t: "error", message: "I couldn't finish that read. Try again in a moment." });
          controller.close();
          return;
        }

        await supabase
          .from("profiles")
          .update({
            analysis,
            analysed_at: new Date().toISOString(),
            onboarding_stage: "analysis",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        send({ t: "done", payload: analysis });
      } catch (error) {
        const message =
          (error as Error).message === "timed_out"
            ? "That took too long. Try again — it's usually quicker."
            : "Couldn't read those photos. Try again in a moment.";
        send({ t: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Without this some proxies buffer the whole body and streaming silently degrades.
      "X-Accel-Buffering": "no",
    },
  });
}
