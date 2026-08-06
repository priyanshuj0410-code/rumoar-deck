import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chat, generateImage, GeminiError, streamChat, TEXT_MODEL, type InlineImage } from "@/lib/gemini";
import { encodeEvent } from "@/lib/ndjson";
import type { ColourAnalysis, Product, StyleSuggestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function prompt(analysis: ColourAnalysis, catalog: Product[]) {
  const stock = catalog.map((p) => `- ${p.slug} · ${p.name} · ₹${p.price_inr}`).join("\n");

  return [
    "You are a menswear stylist for India. Propose exactly three distinct style directions",
    "for one man, grounded in the colour analysis below. Not three outfits — three",
    "directions he could live in, different enough that choosing between them means something.",
    "",
    "His analysis:",
    `- Season: ${analysis.season} (confidence ${analysis.season_confidence})`,
    `- Undertone ${analysis.undertone}, depth ${analysis.depth}, contrast ${analysis.contrast}, chroma ${analysis.chroma}`,
    `- Metals: ${analysis.metals}`,
    `- Colours that work: ${analysis.best_colours.map((c) => `${c.name} ${c.hex}`).join(", ")}`,
    `- Colours to avoid: ${analysis.avoid_colours.map((c) => c.name).join(", ")}`,
    `- Fit notes: ${analysis.build.fit_notes}`,
    "",
    "Accessories RUMOAR actually sells (use slugs from this list only, or an empty array):",
    stock,
    "",
    "Rules:",
    "- Every palette colour must sit inside or next to his best colours.",
    "- Ground each direction in Indian weather and occasions — heat, monsoon, weddings, office.",
    "- key_pieces are garment descriptions, not brands.",
    "- why_it_works references his actual analysis, not generic flattery. Two sentences, max.",
    "- one_liner is at most twelve words.",
    "",
    "OUTPUT: exactly three lines. One complete JSON object per line, nothing else — no",
    "array, no code fence, no commentary. Each line must be valid JSON on its own so it can",
    "be rendered the moment it finishes.",
    JSON.stringify({
      name: "Quiet Utility",
      one_liner: "",
      why_it_works: "",
      palette: [{ name: "Deep olive", hex: "#3B4A2F" }],
      key_pieces: [""],
      product_slugs: [""],
      occasions: [""],
    }),
  ].join("\n");
}

function str(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function strings(value: unknown, limit: number, max = 80): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => str(v, max)).filter(Boolean).slice(0, limit);
}

type ParsedStyle = {
  name: string;
  one_liner: string;
  why_it_works: string;
  palette: { name: string; hex: string }[];
  key_pieces: string[];
  product_slugs: string[];
  occasions: string[];
};

function parseLine(line: string, validSlugs: Set<string>): ParsedStyle | null {
  const trimmed = line.trim().replace(/^```(?:json)?|```$/g, "").trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const s = JSON.parse(trimmed) as Record<string, unknown>;
    const name = str(s.name, 60);
    if (!name) return null;

    const palette = Array.isArray(s.palette)
      ? s.palette
          .map((p) => {
            const item = p as Record<string, unknown>;
            const hex = str(item.hex, 9);
            return {
              name: str(item.name, 60),
              hex: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : "",
            };
          })
          .filter((p) => p.name && p.hex)
          .slice(0, 6)
      : [];

    return {
      name,
      one_liner: str(s.one_liner, 160),
      why_it_works: str(s.why_it_works, 600),
      palette,
      key_pieces: strings(s.key_pieces, 6, 80),
      // Anything invented is dropped rather than shown as a product that doesn't exist.
      product_slugs: strings(s.product_slugs, 4, 60).filter((slug) => validSlugs.has(slug)),
      occasions: strings(s.occasions, 4, 40),
    };
  } catch {
    return null;
  }
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("not signed in", { status: 401 });

  const [{ data: profile }, { data: catalog }] = await Promise.all([
    supabase.from("profiles").select("analysis").eq("id", user.id).single(),
    supabase.from("products").select("*").eq("active", true),
  ]);

  const analysis = profile?.analysis as ColourAnalysis | null;
  if (!analysis) {
    return new Response(
      JSON.stringify({ t: "error", message: "Run the analysis first." }) + "\n",
      { status: 409, headers: { "Content-Type": "application/x-ndjson" } },
    );
  }

  const products = (catalog ?? []) as Product[];
  const validSlugs = new Set(products.map((p) => p.slug));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Parameters<typeof encodeEvent>[0]) =>
        controller.enqueue(encodeEvent(event));

      try {
        send({ t: "status", v: `Working from your ${analysis.season} palette` });

        // Regenerating replaces the previous set rather than stacking a second one.
        const { data: previous } = await supabase
          .from("style_suggestions")
          .select("image_path")
          .eq("user_id", user.id);
        const stale = (previous ?? [])
          .map((row: { image_path: string | null }) => row.image_path)
          .filter((path): path is string => Boolean(path));
        if (stale.length) await supabase.storage.from("looks").remove(stale);
        await supabase.from("style_suggestions").delete().eq("user_id", user.id);

        let buffer = "";
        let rank = 0;

        const flush = async (line: string) => {
          const parsed = parseLine(line, validSlugs);
          if (!parsed || rank >= 3) return;

          const { data: inserted } = await supabase
            .from("style_suggestions")
            .insert({ user_id: user.id, rank, ...parsed })
            .select()
            .single();

          if (inserted) {
            rank++;
            // Each direction ships the moment it is complete, so the first card lands
            // long before the third one finishes generating.
            send({ t: "style", style: inserted as StyleSuggestion });
          }
        };

        const request = {
          turns: [{ role: "user" as const, text: prompt(analysis, products) }],
          model: TEXT_MODEL,
          thinking: "high" as const,
          timeoutMs: 55_000,
        };

        let streamed = "";
        try {
          for await (const delta of streamChat(request)) {
            streamed += delta;
            buffer += delta;
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) await flush(line);
          }
          if (buffer.trim()) await flush(buffer);
        } catch (streamError) {
          // Only swallow it if nothing came through — a mid-stream failure with content
          // already delivered should surface rather than silently double-generate.
          if (streamed) throw streamError;
        }

        // Streaming is an enhancement, not a dependency. If it produced nothing, fall
        // back to the plain call so the user still gets their three directions.
        if (rank === 0) {
          send({ t: "status", v: "Still working" });
          const text = await chat(request);
          for (const line of text.split("\n")) await flush(line);
        }

        if (rank === 0) {
          send({ t: "error", message: "Couldn't put those together. Try again in a moment." });
        } else {
          await supabase
            .from("profiles")
            .update({ onboarding_stage: "styles", updated_at: new Date().toISOString() })
            .eq("id", user.id);
          send({ t: "done" });
        }
      } catch (error) {
        send({
          t: "error",
          message:
            (error as Error).message === "timed_out"
              ? "That took too long. Try again — it's usually quicker."
              : "Couldn't put those together. Try again in a moment.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Renders one style onto his own photo. One image per request — three image calls in a
 * single function invocation would blow past the platform's ceiling.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [{ data: style }, { data: profile }] = await Promise.all([
    supabase.from("style_suggestions").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("reference_photo_path").eq("id", user.id).single(),
  ]);

  if (!style) return NextResponse.json({ error: "not found" }, { status: 404 });

  const suggestion = style as StyleSuggestion;
  const referencePath = profile?.reference_photo_path as string | undefined;
  if (!referencePath) {
    return NextResponse.json(
      { error: "no_reference_photo", message: "Add a photo of yourself first." },
      { status: 409 },
    );
  }

  if (suggestion.image_path) {
    const { data: signed } = await supabase.storage
      .from("looks")
      .createSignedUrl(suggestion.image_path, 3600);
    if (signed?.signedUrl) return NextResponse.json({ url: signed.signedUrl, cached: true });
  }

  // Prefer the small derivative written at intake; fall back to the full-size original
  // for accounts that predate it.
  const smallPath = referencePath.replace(/\.jpg$/, "-sm.jpg");
  const { data: small } = await supabase.storage.from("wardrobe").download(smallPath);
  const file =
    small ?? (await supabase.storage.from("wardrobe").download(referencePath)).data ?? null;

  if (!file) {
    return NextResponse.json(
      { error: "reference_unreadable", message: "Your reference photo couldn't be opened." },
      { status: 409 },
    );
  }

  const reference: InlineImage = {
    mimeType: file.type || "image/jpeg",
    data: Buffer.from(await file.arrayBuffer()).toString("base64"),
  };

  try {
    const generated = await generateImage({
      prompt: [
        "Keep the man in the image exactly as he is: same face, same skin tone, same hair,",
        "same body shape, same height and build. Do not beautify, slim, lighten or age him.",
        "Photorealistic, full-length, shot on a 50mm lens at eye level.",
        `Dress him in this style — ${suggestion.name}: ${suggestion.one_liner ?? ""}`,
        `Garments: ${suggestion.key_pieces.join(", ")}.`,
        `Use this colour palette only: ${suggestion.palette.map((p) => `${p.name} (${p.hex})`).join(", ")}.`,
        // A studio sweep shows the clothes; a real place shows the life they are for.
        `Place him somewhere real and Indian that suits ${suggestion.occasions[0] ?? "this look"}`,
        "— a city street, a courtyard, a cafe, a venue — in natural light, with the",
        "background softly out of focus. Never a plain studio backdrop.",
        "Clothes should fit properly and look like real garments, not costume.",
      ].join(" "),
      images: [reference],
      aspectRatio: "3:4",
      // Must stay under the platform's 60s function ceiling, or Vercel kills the request
      // and the client gets an unparseable 504 instead of a legible reason.
      timeoutMs: 52_000,
    });

    const path = `${user.id}/style-${suggestion.id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("looks")
      .upload(path, Buffer.from(generated.data, "base64"), {
        contentType: generated.mimeType,
        upsert: true,
      });
    if (uploadError) throw new GeminiError(uploadError.message, 502);

    await supabase
      .from("style_suggestions")
      .update({ image_path: path })
      .eq("id", suggestion.id)
      .eq("user_id", user.id);

    const { data: signed } = await supabase.storage.from("looks").createSignedUrl(path, 3600);
    return NextResponse.json({ url: signed?.signedUrl ?? null });
  } catch (error) {
    const reason = (error as Error).message;
    // Surfacing why it failed — a timeout, a refusal and a dead network all looked
    // identical before, which made this impossible to diagnose from a screenshot.
    const message =
      reason === "timed_out"
        ? "That render took too long. Tap to try again."
        : reason.includes("429")
          ? "Image quota reached for now. Try again shortly."
          : "Couldn't render that one. Tap to try again.";
    return NextResponse.json(
      { error: "render_failed", reason: reason.slice(0, 4000), message },
      { status: error instanceof GeminiError ? error.status : 502 },
    );
  }
}

/**
 * Refine one direction from a note the user wrote about it.
 *
 * The note is authoritative — he is telling us the direction missed. It is kept twice:
 * on the style, so the next generation has the whole conversation, and in
 * `style_feedback`, so the notes can be read across users to improve the prompt itself.
 */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: string; note?: string } | null;
  const id = body?.id;
  const note = body?.note?.trim().slice(0, 500);
  if (!id || !note) return NextResponse.json({ error: "id and note required" }, { status: 400 });

  const [{ data: style }, { data: profile }, { data: catalog }] = await Promise.all([
    supabase.from("style_suggestions").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("analysis").eq("id", user.id).single(),
    supabase.from("products").select("*").eq("active", true),
  ]);

  const current = style as StyleSuggestion | null;
  const analysis = profile?.analysis as ColourAnalysis | null;
  if (!current || !analysis) return NextResponse.json({ error: "not found" }, { status: 404 });

  const products = (catalog ?? []) as Product[];
  const notes = [...(current.refinements ?? []), note];

  // Recorded before the regeneration, and with the name copied in: the row this note is
  // about is the one we are about to overwrite.
  await supabase.from("style_feedback").insert({
    user_id: user.id,
    style_id: current.id,
    style_name: current.name,
    note,
  });

  const refinePrompt = [
    prompt(analysis, products),
    "",
    "THIS IS A REVISION OF ONE DIRECTION, not a new set. Return exactly ONE JSON object",
    "on a single line, in the same shape.",
    "",
    "The direction as it stands:",
    JSON.stringify({
      name: current.name,
      one_liner: current.one_liner,
      why_it_works: current.why_it_works,
      palette: current.palette,
      key_pieces: current.key_pieces,
      occasions: current.occasions,
    }),
    "",
    "What he has asked for, oldest first:",
    ...notes.map((entry) => `- "${entry}"`),
    "",
    "Change what he asked to change and leave the rest alone. He knows his own life, so",
    "where his note conflicts with your reasoning, follow the note. Keep the palette",
    "inside his analysis regardless — that is the one thing a preference cannot override,",
    "and say so in why_it_works if his request pulls against it.",
  ].join("\n");

  try {
    const raw = await chat({
      turns: [{ role: "user", text: refinePrompt }],
      model: TEXT_MODEL,
      thinking: "high",
      timeoutMs: 50_000,
    });

    const validSlugs = new Set(products.map((p) => p.slug));
    const parsed =
      raw
        .split("\n")
        .map((line) => parseLine(line, validSlugs))
        .find((entry): entry is ParsedStyle => entry !== null) ?? null;

    if (!parsed) throw new GeminiError("unparseable revision", 502);

    // The old render no longer matches the direction, so it goes with it.
    if (current.image_path) {
      await supabase.storage.from("looks").remove([current.image_path]);
    }

    const { data: updated } = await supabase
      .from("style_suggestions")
      .update({ ...parsed, refinements: notes, image_path: null })
      .eq("id", current.id)
      .eq("user_id", user.id)
      .select()
      .single();

    return NextResponse.json({ style: updated as StyleSuggestion });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    return NextResponse.json(
      { error: "refine_failed", message: "Couldn't rework that one. Try again in a moment." },
      { status },
    );
  }
}
