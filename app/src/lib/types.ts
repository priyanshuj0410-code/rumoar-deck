export type ItemKind =
  | "top"
  | "bottom"
  | "footwear"
  | "outerwear"
  | "bag"
  | "eyewear"
  | "headwear"
  | "other";

export const ITEM_KINDS: ItemKind[] = [
  "top",
  "bottom",
  "footwear",
  "outerwear",
  "bag",
  "eyewear",
  "headwear",
  "other",
];

export type OnboardingStage = "call" | "vibe" | "photos" | "wardrobe" | "reveal" | "done";

export type Profile = {
  id: string;
  display_name: string | null;
  vibe: string | null;
  occasions: string[] | null;
  budget_band: "value" | "mid" | "premium" | null;
  onboarding_stage: OnboardingStage;
  /** The photo every generated image is rendered from. Lives in the `wardrobe` bucket. */
  reference_photo_path: string | null;
};

export type WardrobeItem = {
  id: string;
  user_id: string;
  image_path: string | null;
  label: string;
  kind: ItemKind;
  colour: string | null;
  source: "vision" | "manual" | "sample";
  confidence: number | null;
  created_at: string;
};

export type LookItemRef = {
  type: "wardrobe" | "product";
  id: string;
  x?: number;
  y?: number;
};

export type Look = {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  rating: number | null;
  item_refs: LookItemRef[] | null;
  saved: boolean;
  created_at: string;
  kind: "reveal" | "tryon" | "other";
  product_slug: string | null;
  stage: number | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  kind: ItemKind;
  price_inr: number;
  image_path: string | null;
  description: string | null;
  active: boolean;
};

export type Message = {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  meta: { productSlugs?: string[] } | null;
  created_at: string;
};

export function formatINR(paise: number): string {
  return `₹${paise.toLocaleString("en-IN")}`;
}
