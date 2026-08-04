/**
 * Uploads catalog imagery to the public `catalog` bucket and upserts the product rows.
 * Requires SUPABASE_SERVICE_ROLE_KEY — the catalog has no client write policy by design.
 *
 *   npm run seed
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(here, "..", "public", "samples", "catalog");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

// The seed list is TypeScript; keep one copy by reading and evaluating the literal.
const source = readFileSync(join(here, "..", "src", "lib", "catalog.ts"), "utf8");
const match = source.match(/export const SEED_PRODUCTS: SeedProduct\[\] = (\[[\s\S]*?\n\];)/);
if (!match) {
  console.error("Could not read SEED_PRODUCTS from src/lib/catalog.ts");
  process.exit(1);
}
const products = eval(match[1].replace(/;\s*$/, ""));

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

let uploaded = 0;
for (const p of products) {
  const file = join(IMAGES, `${p.slug}.jpg`);
  if (!existsSync(file)) {
    console.warn(`  no image for ${p.slug} — row will have a null image_path`);
    continue;
  }
  const { error } = await supabase.storage
    .from("catalog")
    .upload(`${p.slug}.jpg`, readFileSync(file), { contentType: "image/jpeg", upsert: true });
  if (error) {
    console.error(`  upload failed for ${p.slug}: ${error.message}`);
    continue;
  }
  p.image_path = `${p.slug}.jpg`;
  uploaded++;
}

const { error } = await supabase
  .from("products")
  .upsert(
    products.map((p) => ({ ...p, active: true })),
    { onConflict: "slug" },
  );

if (error) {
  console.error(`Upsert failed: ${error.message}`);
  process.exit(1);
}

console.log(`Seeded ${products.length} products, ${uploaded} images.`);
