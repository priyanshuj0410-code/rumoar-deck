import type { ItemKind } from "./types";

export type SeedProduct = {
  slug: string;
  name: string;
  kind: ItemKind;
  price_inr: number;
  description: string;
};

/**
 * The launch catalog, carried over from the prototype. This is the seed source of truth —
 * `npm run seed` uploads the matching image from public/samples/catalog and upserts these
 * rows. At runtime the app always reads the `products` table, never this array.
 */
export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: "leather-sling",
    name: "Leather sling, full-grain",
    kind: "bag",
    price_inr: 3000,
    description:
      "Full-grain veg-tan, tannage and Kolkata cluster named. Worn across the chest it draws a long clean line. The one keystone that lifts the most looks.",
  },
  {
    slug: "canvas-sling",
    name: "Canvas roll-top sling",
    kind: "bag",
    price_inr: 2499,
    description:
      "Heavy bone canvas with olive full-grain trim. Lighter entry, monsoon-practical, same quiet lines.",
  },
  {
    slug: "clip-pouch",
    name: "Clip pouch (the motif)",
    kind: "bag",
    price_inr: 1499,
    description:
      "The carabiner pouch. Clips to a strap or belt loop. The detail people notice.",
  },
  {
    slug: "bifold-wallet",
    name: "Bifold wallet, full-grain",
    kind: "other",
    price_inr: 2200,
    description: "Full-grain veg-tan, saddle stitch. No one else at this price writes full-grain.",
  },
  {
    slug: "card-holder",
    name: "Card holder, full-grain",
    kind: "other",
    price_inr: 1299,
    description: "The entry ticket to the leather story. Future monogram gift.",
  },
  {
    slug: "cap-minimal",
    name: "Cap, structured minimal",
    kind: "headwear",
    price_inr: 1100,
    description: "Bone canvas, unbranded, quiet. Streetwear owns loud; nobody owns the quiet cap.",
  },
  {
    slug: "cap-blue",
    name: "Cap, Luminous Blue",
    kind: "headwear",
    price_inr: 1300,
    description: "The Colour of the Year worn as one flash.",
  },
  {
    slug: "canvas-tote",
    name: "Canvas + leather tote",
    kind: "bag",
    price_inr: 2499,
    description: "Masculine canvas-and-leather tote. No one makes this under Mokobara's ₹6,499.",
  },
  {
    slug: "backpack",
    name: "Backpack, second-line",
    kind: "bag",
    price_inr: 4500,
    description: "Charcoal canvas, black leather base. Clean, quiet, follows demand.",
  },
];

/** The starter wardrobe offered during onboarding when someone has no photos to hand. */
export const SAMPLE_WARDROBE: { slug: string; label: string; kind: ItemKind }[] = [
  { slug: "olive-shirt", label: "Olive linen shirt", kind: "top" },
  { slug: "rust-shirt", label: "Rust linen shirt", kind: "top" },
  { slug: "navy-shirt", label: "Navy linen shirt", kind: "top" },
  { slug: "white-shirt", label: "Ecru linen shirt", kind: "top" },
  { slug: "cream-trousers", label: "Cream trousers", kind: "bottom" },
  { slug: "olive-trousers", label: "Olive trousers", kind: "bottom" },
  { slug: "brown-trousers", label: "Brown trousers", kind: "bottom" },
  { slug: "white-tee", label: "Plain white tee", kind: "top" },
  { slug: "black-sneakers", label: "Black sneakers", kind: "footwear" },
  { slug: "glasses", label: "Metal-frame glasses", kind: "eyewear" },
  { slug: "watch", label: "Everyday watch", kind: "other" },
  { slug: "canvas-bag", label: "Canvas tote bag", kind: "bag" },
];
