import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chat, GeminiError, TEXT_MODEL, type InlineImage } from "@/lib/gemini";
import type { ColourAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEASONS = [
  "Light Spring", "Warm Spring", "Clear Spring",
  "Light Summer", "Cool Summer", "Soft Summer",
  "Soft Autumn", "Warm Autumn", "Deep Autumn",
  "Deep Winter", "Cool Winter", "Clear Winter",
];

const PROMPT = [
  "You are a professional colour analyst and menswear fit consultant.",
  "You are looking at several photos of the same man, taken front, side and back.",
  "",
  "Work through the three colour dimensions before naming a season:",
  "1. HUE — is his skin undertone warm (golden/peach), cool (pink/blue), neutral, or olive?",
  "2. VALUE — how light or deep are his colouring overall (skin, hair, eyes together)?",
  "3. CHROMA — do his features look soft and blended, or clear and saturated?",
  "Then judge CONTRAST: the gap between his hair, skin and eyes. Deep hair with light skin",
  "is high contrast; hair, skin and eyes close in value is low contrast.",
  "",
  `Name the closest of the twelve seasons: ${SEASONS.join(", ")}.`,
  "",
  "Also give practical fit notes from the full-body shots — frame, proportions, and what",
  "cuts and lengths sit well. This is about clothing fit only. Never comment on weight,",
  "attractiveness, fitness or perceived health, and never guess age, ethnicity or origin.",
  "",
  "Be honest about uncertainty. Phone cameras, indoor lighting and auto white balance all",
  "shift apparent skin tone. Set season_confidence between 0 and 1 accordingly, and if the",
  "lighting is poor say so in `caveat`.",
  "",
  "Reply with JSON only — no prose, no code fence:",
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
  "Give 6 to 8 best_colours and 3 to 4 avoid_colours, each with a real hex value.",
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
        // A bad hex would silently render as a black chip; drop it instead.
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
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("photo_paths")
    .eq("id", user.id)
    .single();

  const paths = ((profile?.photo_paths ?? []) as string[]).slice(0, 6);
  if (paths.length < 3) {
    return NextResponse.json(
      { error: "not_enough_photos", message: "Add at least three photos first." },
      { status: 409 },
    );
  }

  const images = (await Promise.all(paths.map((path) => download(supabase, path)))).filter(
    (image): image is InlineImage => image !== null,
  );

  if (images.length < 3) {
    return NextResponse.json({ error: "photos_unreadable" }, { status: 409 });
  }

  try {
    const raw = await chat({
      turns: [{ role: "user", text: PROMPT, images }],
      // Pinned to Flash. The analysis is worth thinking about, so we buy accuracy with
      // reasoning budget rather than a more expensive model tier.
      model: TEXT_MODEL,
      thinking: "high",
      timeoutMs: 55_000,
    });

    const analysis = parse(raw);
    if (!analysis) throw new GeminiError("unparseable analysis", 502);

    await supabase
      .from("profiles")
      .update({
        analysis,
        analysed_at: new Date().toISOString(),
        onboarding_stage: "analysis",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ analysis });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    return NextResponse.json(
      { error: "analysis_failed", message: "Couldn't read those photos. Try again in a moment." },
      { status },
    );
  }
}
