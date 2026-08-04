import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Look, Product, Profile, WardrobeItem } from "@/lib/types";

const SIGNED_TTL = 60 * 60; // an hour is plenty for a page view and keeps URLs short-lived

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

/** Batch-signs private storage paths. Returns a map of path → URL; misses are omitted. */
export async function signPaths(
  bucket: "wardrobe" | "looks",
  paths: (string | null)[],
): Promise<Record<string, string>> {
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (wanted.length === 0) return {};

  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(wanted, SIGNED_TTL);

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
  }
  return out;
}

export function catalogUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/catalog/${path}`;
}

export async function getWardrobe(): Promise<WardrobeItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wardrobe_items")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as WardrobeItem[]) ?? [];
}

export async function getLooks(savedOnly = false): Promise<Look[]> {
  const supabase = await createClient();
  let query = supabase.from("looks").select("*").order("created_at", { ascending: false });
  if (savedOnly) query = query.eq("saved", true);
  const { data } = await query;
  return (data as Look[]) ?? [];
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("price_inr", { ascending: false });
  return (data as Product[]) ?? [];
}

export async function getProduct(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
  return (data as Product) ?? null;
}

export async function getSavedProductIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_products").select("product_id");
  return new Set((data ?? []).map((r: { product_id: string }) => r.product_id));
}
