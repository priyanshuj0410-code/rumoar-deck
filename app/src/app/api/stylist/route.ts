import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chat, GeminiError, type Turn } from "@/lib/gemini";
import type { Product, Profile, WardrobeItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const HISTORY_LIMIT = 20;

function systemPrompt(profile: Profile | null, wardrobe: WardrobeItem[], catalog: Product[]) {
  const owns = wardrobe.length
    ? wardrobe.map((w) => `- ${w.label} (${w.kind}${w.colour ? `, ${w.colour}` : ""})`).join("\n")
    : "- (nothing recorded yet)";

  const stock = catalog
    .map((p) => `- ${p.slug} · ${p.name} · ₹${p.price_inr} · ${p.description ?? ""}`)
    .join("\n");

  return [
    "You are RUMOAR — a men's accessories stylist for India. You are direct, warm and brief.",
    "You speak like a knowledgeable friend, never like a catalogue. Two or three sentences unless asked for more.",
    "",
    `The man you are styling${profile?.display_name ? ` is called ${profile.display_name}` : ""}.`,
    profile?.vibe ? `He describes his style as: ${profile.vibe}.` : "",
    profile?.occasions?.length ? `He dresses for: ${profile.occasions.join(", ")}.` : "",
    "",
    "What he already owns:",
    owns,
    "",
    "What RUMOAR sells (recommend only from this list, by slug):",
    stock,
    "",
    "Rules:",
    "- Style from what he owns first. Only suggest buying when it genuinely finishes a look.",
    "- Never invent products, prices or stock. If nothing fits, say so.",
    "- When you recommend a product, end your reply with a line: PRODUCTS: slug, slug",
    "- Prices are in rupees. Never quote a price you were not given.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pulls the trailing PRODUCTS: line out of the reply so the UI can render real cards. */
function splitProducts(reply: string, valid: Set<string>) {
  const match = reply.match(/\n?PRODUCTS:\s*(.+)\s*$/i);
  if (!match) return { content: reply.trim(), productSlugs: [] as string[] };

  const slugs = match[1]
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => valid.has(s));

  return { content: reply.slice(0, match.index).trim(), productSlugs: [...new Set(slugs)] };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "too long" }, { status: 400 });

  const [{ data: profile }, { data: wardrobe }, { data: catalog }, { data: history }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("wardrobe_items").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").eq("active", true),
      supabase
        .from("messages")
        .select("role, content")
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT),
    ]);

  await supabase.from("messages").insert({ user_id: user.id, role: "user", content: text });

  const products = (catalog ?? []) as Product[];
  const turns: Turn[] = [
    ...((history ?? []) as { role: "user" | "assistant"; content: string }[])
      .reverse()
      .map<Turn>((m) =>
        m.role === "assistant"
          ? { role: "model", text: m.content }
          : { role: "user", text: m.content },
      ),
    { role: "user", text },
  ];

  try {
    const raw = await chat({
      system: systemPrompt(profile as Profile, (wardrobe ?? []) as WardrobeItem[], products),
      turns,
    });
    const { content, productSlugs } = splitProducts(raw, new Set(products.map((p) => p.slug)));

    const { data: saved } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        role: "assistant",
        content,
        meta: productSlugs.length ? { productSlugs } : null,
      })
      .select()
      .single();

    return NextResponse.json({ message: saved });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    // The user's message is already persisted; record the failure so the thread reads honestly.
    const fallback =
      "I couldn't reach my styling brain just then. Ask me again in a moment — your wardrobe is safe.";
    const { data: saved } = await supabase
      .from("messages")
      .insert({ user_id: user.id, role: "assistant", content: fallback })
      .select()
      .single();
    return NextResponse.json(
      { message: saved, degraded: true },
      { status: status === 500 ? 500 : 200 },
    );
  }
}
