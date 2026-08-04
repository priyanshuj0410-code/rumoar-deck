"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ITEM_KINDS, type ItemKind, type OnboardingStage } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

export async function setStage(stage: OnboardingStage) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({ onboarding_stage: stage, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/onboarding");
}

/**
 * The photo every generated image is rendered from. Whichever shot he uploads first is
 * the one the reveal and try-on renders are built on, so it is stored on the profile
 * rather than left buried among the wardrobe uploads.
 */
export async function setReferencePhoto(path: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({ reference_photo_path: path, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/onboarding");
}

export async function saveVibe(input: {
  displayName: string;
  vibe: string;
  occasions: string[];
}) {
  const { supabase, user } = await requireUser();

  await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim().slice(0, 40) || null,
      vibe: input.vibe.trim().slice(0, 300) || null,
      occasions: input.occasions.slice(0, 8),
      onboarding_stage: "photos",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/onboarding");
}

export async function saveWardrobe(
  items: { label: string; kind: string; colour?: string | null; image_path?: string | null }[],
) {
  const { supabase, user } = await requireUser();

  const rows = items
    .filter((item) => item.label?.trim())
    .slice(0, 40)
    .map((item) => ({
      user_id: user.id,
      label: item.label.trim().slice(0, 60),
      kind: (ITEM_KINDS.includes(item.kind as ItemKind) ? item.kind : "other") as ItemKind,
      colour: item.colour?.trim().slice(0, 40) || null,
      image_path: item.image_path || null,
      source: item.image_path ? ("vision" as const) : ("sample" as const),
    }));

  if (rows.length > 0) {
    await supabase.from("wardrobe_items").insert(rows);
  }

  await supabase
    .from("profiles")
    .update({ onboarding_stage: "reveal", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/onboarding");
}

/** The reveal shots are already persisted by /api/render, so this only closes the flow. */
export async function finishOnboarding() {
  const { supabase, user } = await requireUser();

  await supabase
    .from("profiles")
    .update({ onboarding_stage: "done", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/app");
}
