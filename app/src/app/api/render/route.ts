import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage, GeminiError, type InlineImage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const SIGNED_TTL = 60 * 60;

/**
 * Identity is the whole product here. Every prompt leads with "do not change the man"
 * because Nano Banana will happily beautify a face if you let it, and a stylist that
 * hands you a photo of someone else is worthless.
 */
const KEEP_HIM = [
  "Keep the man in the first image exactly as he is: same face, same skin tone, same hair,",
  "same body shape, same pose, same expression. Do not beautify, slim, lighten or age him.",
  "Photorealistic, natural light, sharp focus, full-length or three-quarter framing.",
].join(" ");

const REVEAL_PROMPTS = [
  // Stage 0 — him, normalised onto a clean backdrop so all three shots read as a series.
  `${KEEP_HIM} Keep the clothes he is already wearing exactly as they are. Place him against a clean, neutral off-white studio backdrop with soft even lighting. Do not add or remove any garment or accessory.`,
  // Stage 1 — one keystone piece added, nothing else touched.
  `${KEEP_HIM} Keep every garment he is wearing exactly as it is. Add only the accessory shown in the second image, worn naturally and correctly scaled. Same neutral off-white studio backdrop. Change nothing else.`,
  // Stage 2 — the fully finished version.
  `${KEEP_HIM} Keep his garments as they are. Add the accessories shown in the following images, worn together naturally and correctly scaled, styled the way a confident dresser would wear them. Same neutral off-white studio backdrop. Do not change his clothes.`,
];

const TRYON_PROMPT = `${KEEP_HIM} Keep every garment he is wearing exactly as it is. Add only the product shown in the second image, worn naturally, correctly scaled and correctly oriented for how that item is actually carried or worn. Keep his original background. Change nothing else.`;

async function toInlineFromBucket(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string,
): Promise<InlineImage | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  return { mimeType: data.type || "image/jpeg", data: buffer.toString("base64") };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    kind?: "reveal" | "tryon";
    stage?: number;
    productSlug?: string;
  } | null;

  const kind = body?.kind === "tryon" ? "tryon" : "reveal";
  const stage = kind === "reveal" ? Math.min(2, Math.max(0, Math.trunc(body?.stage ?? 0))) : null;
  const productSlug = body?.productSlug ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("reference_photo_path")
    .eq("id", user.id)
    .single();

  const referencePath = profile?.reference_photo_path as string | undefined;
  if (!referencePath) {
    return NextResponse.json(
      { error: "no_reference_photo", message: "Add a photo of yourself first." },
      { status: 409 },
    );
  }

  // Serve a previous generation rather than paying for the same image twice.
  const existingQuery = supabase
    .from("looks")
    .select("*")
    .eq("kind", kind)
    .eq("stage", stage as unknown as number);
  const { data: existing } = productSlug
    ? await existingQuery.eq("product_slug", productSlug).maybeSingle()
    : await existingQuery.is("product_slug", null).maybeSingle();

  if (existing?.image_path) {
    const { data: signed } = await supabase.storage
      .from("looks")
      .createSignedUrl(existing.image_path, SIGNED_TTL);
    if (signed?.signedUrl) {
      return NextResponse.json({ look: existing, url: signed.signedUrl, cached: true });
    }
  }

  // Prefer the small derivative written at intake — same identity, a quarter of the
  // payload, a much faster render.
  const reference =
    (await toInlineFromBucket(supabase, "wardrobe", referencePath.replace(/\.jpg$/, "-sm.jpg"))) ??
    (await toInlineFromBucket(supabase, "wardrobe", referencePath));

  if (!reference) {
    return NextResponse.json({ error: "reference photo unreadable" }, { status: 409 });
  }

  // Which product shots to composite in.
  const slugs =
    kind === "tryon"
      ? productSlug
        ? [productSlug]
        : []
      : stage === 1
        ? ["leather-sling"]
        : stage === 2
          ? ["leather-sling", "clip-pouch"]
          : [];

  const productImages: InlineImage[] = [];
  if (slugs.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("slug, name, image_path")
      .in("slug", slugs);

    for (const slug of slugs) {
      const product = (products ?? []).find((p: { slug: string }) => p.slug === slug);
      if (!product?.image_path) continue;
      const image = await toInlineFromBucket(supabase, "catalog", product.image_path);
      if (image) productImages.push(image);
    }
  }

  if (kind === "tryon" && productImages.length === 0) {
    return NextResponse.json({ error: "product image unavailable" }, { status: 404 });
  }

  try {
    const generated = await generateImage({
      prompt: kind === "tryon" ? TRYON_PROMPT : REVEAL_PROMPTS[stage ?? 0],
      images: [reference, ...productImages],
      aspectRatio: "3:4",
      timeoutMs: 50_000,
    });

    const path = `${user.id}/${kind}-${productSlug ?? stage}-${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("looks")
      .upload(path, Buffer.from(generated.data, "base64"), {
        contentType: generated.mimeType,
        upsert: true,
      });
    if (uploadError) throw new GeminiError(uploadError.message, 502);

    // Replace any earlier generation for this slot, and drop its image so storage does
    // not fill up with superseded renders.
    if (existing) {
      await supabase.from("looks").delete().eq("id", existing.id).eq("user_id", user.id);
      if (existing.image_path) {
        await supabase.storage.from("looks").remove([existing.image_path]);
      }
    }

    const titles = ["You, today", "The keystone", "Peak"];
    const { data: look } = await supabase
      .from("looks")
      .insert({
        user_id: user.id,
        kind,
        stage,
        product_slug: productSlug,
        title: kind === "tryon" ? "On you" : titles[stage ?? 0],
        subtitle:
          kind === "tryon"
            ? "Generated from your photo"
            : ["What you already own", "One piece added", "Where this goes"][stage ?? 0],
        image_path: path,
        rating: kind === "reveal" ? [35, 68, 92][stage ?? 0] : null,
        saved: kind === "reveal",
      })
      .select()
      .single();

    const { data: signed } = await supabase.storage.from("looks").createSignedUrl(path, SIGNED_TTL);

    return NextResponse.json({ look, url: signed?.signedUrl ?? null });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    return NextResponse.json(
      {
        error: "generation_failed",
        message: "Couldn't render that just now. Try again in a moment.",
      },
      { status },
    );
  }
}
