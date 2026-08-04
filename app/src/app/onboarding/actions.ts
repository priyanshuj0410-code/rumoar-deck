"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingStage } from "@/lib/types";

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
 * The intake set. The first photo is the front shot and doubles as the reference every
 * generated image is rendered from, so it is stored on the profile in both places.
 */
export async function savePhotos(paths: string[]) {
  const { supabase, user } = await requireUser();
  const clean = paths.filter(Boolean).slice(0, 6);
  if (clean.length === 0) return;

  await supabase
    .from("profiles")
    .update({
      photo_paths: clean,
      reference_photo_path: clean[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/onboarding");
}

export async function finishOnboarding() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({ onboarding_stage: "done", updated_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/app");
}
