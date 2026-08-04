"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ITEM_KINDS, type ItemKind } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

export async function addWardrobeItem(formData: FormData) {
  const { supabase, user } = await requireUser();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  const rawKind = String(formData.get("kind") ?? "other");
  const kind: ItemKind = ITEM_KINDS.includes(rawKind as ItemKind) ? (rawKind as ItemKind) : "other";
  const colour = String(formData.get("colour") ?? "").trim() || null;
  const imagePath = String(formData.get("image_path") ?? "").trim() || null;

  await supabase.from("wardrobe_items").insert({
    user_id: user.id,
    label: label.slice(0, 60),
    kind,
    colour,
    image_path: imagePath,
    source: imagePath ? "vision" : "manual",
  });

  revalidatePath("/app/wardrobe");
}

export async function deleteWardrobeItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: item } = await supabase
    .from("wardrobe_items")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  // RLS already scopes the delete; the user_id filter keeps the intent explicit.
  await supabase.from("wardrobe_items").delete().eq("id", id).eq("user_id", user.id);

  if (item?.image_path) {
    await supabase.storage.from("wardrobe").remove([item.image_path]);
  }

  revalidatePath("/app/wardrobe");
}

export async function toggleSavedProduct(formData: FormData) {
  const { supabase, user } = await requireUser();
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return;

  const { data: existing } = await supabase
    .from("saved_products")
    .select("product_id")
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_products")
      .delete()
      .eq("product_id", productId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("saved_products").insert({ user_id: user.id, product_id: productId });
  }

  revalidatePath("/app/saved");
  revalidatePath("/app/shop");
  revalidatePath(`/app/shop/${String(formData.get("slug") ?? "")}`);
}

export async function toggleSavedLook(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const saved = String(formData.get("saved") ?? "") === "true";
  if (!id) return;

  await supabase.from("looks").update({ saved: !saved }).eq("id", id).eq("user_id", user.id);

  revalidatePath("/app/saved");
  revalidatePath("/app");
}
