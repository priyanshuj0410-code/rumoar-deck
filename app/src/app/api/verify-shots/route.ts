import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chat, TEXT_MODEL, toInline } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANGLES = ["front", "side", "back", "unclear"] as const;
type Angle = (typeof ANGLES)[number];

const EXPECTED: Angle[] = ["front", "side", "back"];

const PROMPT = [
  "You are checking that a set of intake photos shows the angles they are supposed to.",
  "The images are given in order and should be: 1 front, 2 side, 3 back.",
  "",
  "For each image in order, say which way the person is actually facing:",
  '- "front" — face and chest toward the camera',
  '- "side" — turned roughly 90°, one shoulder toward the camera, profile visible',
  '- "back" — facing away, back of the head and shoulders toward the camera',
  '- "unclear" — cropped, too dark, no person, or genuinely ambiguous',
  "",
  "Judge only the direction the body faces. Do not comment on the person.",
  "Reply with JSON only, no prose, no code fence:",
  '{"angles":["front","side","back"]}',
].join("\n");

function parse(raw: string): Angle[] {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { angles?: unknown };
    if (!Array.isArray(parsed.angles)) return [];
    return parsed.angles
      .map((value) => (ANGLES.includes(value as Angle) ? (value as Angle) : "unclear"))
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Confirms the three shots are actually front, side and back before an analysis is built
 * on them. A side shot filed as the front skews every read that follows, and the user has
 * no way of knowing that happened.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { images?: string[] } | null;
  const images = (body?.images ?? [])
    .filter((image): image is string => typeof image === "string" && image.length > 0)
    .slice(0, 3)
    .map((image) => toInline(image));

  if (images.length !== 3) {
    return NextResponse.json({ error: "three images required" }, { status: 400 });
  }

  try {
    const raw = await chat({
      turns: [{ role: "user", text: PROMPT, images }],
      model: TEXT_MODEL,
      thinking: "low",
      timeoutMs: 30_000,
    });

    const angles = parse(raw);
    if (angles.length !== 3) {
      // An unreadable check must never block the flow; it is a safeguard, not a gate.
      return NextResponse.json({ checked: false, mismatches: [] });
    }

    const mismatches = EXPECTED.map((expected, index) => ({
      index,
      expected,
      detected: angles[index],
    })).filter((shot) => shot.detected !== shot.expected);

    return NextResponse.json({ checked: true, angles, mismatches });
  } catch {
    return NextResponse.json({ checked: false, mismatches: [] });
  }
}
