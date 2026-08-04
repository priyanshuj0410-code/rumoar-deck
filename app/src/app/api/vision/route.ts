import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chat, GeminiError, toInline } from "@/lib/gemini";
import { ITEM_KINDS, type ItemKind } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROMPT = [
  "You are cataloguing a man's wardrobe from photos of him wearing his own clothes.",
  "List every garment and accessory you can actually see across the images.",
  "Merge duplicates — if the same shirt appears in two photos, list it once.",
  "Reply with JSON only, no prose, no code fence, in this exact shape:",
  '{"items":[{"label":"Olive linen shirt","kind":"top","colour":"olive"}]}',
  `kind must be one of: ${ITEM_KINDS.join(", ")}.`,
  "label is at most four words and names the garment, not the person.",
  "Skip anything you cannot clearly see. Skip skin, hair and background objects.",
].join(" ");

type VisionItem = { label: string; kind: ItemKind; colour: string | null };

function parseItems(raw: string): VisionItem[] {
  // Models still wrap JSON in prose or fences often enough that we extract rather than trust.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { items?: unknown };
    if (!Array.isArray(parsed.items)) return [];

    const seen = new Set<string>();
    const out: VisionItem[] = [];

    for (const entry of parsed.items) {
      const item = entry as Record<string, unknown>;
      const label = typeof item.label === "string" ? item.label.trim().slice(0, 60) : "";
      if (!label) continue;

      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        label,
        kind: ITEM_KINDS.includes(item.kind as ItemKind) ? (item.kind as ItemKind) : "other",
        colour: typeof item.colour === "string" ? item.colour.trim().slice(0, 40) : null,
      });
      if (out.length === 16) break;
    }

    return out;
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { images?: string[] } | null;
  const images = (body?.images ?? [])
    .filter((image): image is string => typeof image === "string" && image.length > 0)
    .slice(0, 4)
    .map((image) => toInline(image));

  if (images.length === 0) {
    return NextResponse.json({ error: "images required" }, { status: 400 });
  }

  try {
    // One call sees every photo at once, which is what makes cross-photo dedup possible.
    const raw = await chat({
      turns: [{ role: "user", text: PROMPT, images }],
      thinking: "medium",
    });
    return NextResponse.json({ items: parseItems(raw) });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    // The caller falls back to manual entry — a failed read must never block onboarding.
    return NextResponse.json({ items: [], degraded: true }, { status });
  }
}
