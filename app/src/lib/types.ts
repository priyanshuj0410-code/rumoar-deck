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

export type OnboardingStage = "photos" | "analysis" | "styles" | "done";

export type Swatch = { name: string; hex: string; why?: string };

/**
 * Seasonal colour analysis, read from the intake photos.
 *
 * `confidence` is load-bearing, not decoration: white balance, indoor lighting and phone
 * processing all shift apparent skin tone, so the model is required to say how sure it is
 * and the UI shows it.
 */
export type ColourAnalysis = {
  undertone: "warm" | "cool" | "neutral" | "olive";
  depth: "light" | "medium" | "deep";
  contrast: "low" | "medium" | "high";
  chroma: "soft" | "muted" | "clear" | "bright";
  season: string;
  season_confidence: number;
  features: { skin: string; hair: string; eyes: string };
  build: { frame: string; proportions: string; fit_notes: string };
  /**
   * Everything that drives fit and silhouette rather than colour. Each field carries its
   * own styling consequence, because "rectangle build" on its own tells him nothing.
   */
  physique: {
    body_shape: string;
    body_shape_styling: string;
    face_shape: string;
    face_shape_styling: string;
    hair: { colour: string; length: string; texture: string; styling: string };
    beard: { present: boolean; colour: string; length: string; styling: string };
  };
  best_colours: Swatch[];
  avoid_colours: Swatch[];
  metals: "gold" | "silver" | "both";
  notes: string;
  caveat?: string;
  /**
   * Every correction the user has made, oldest first. Kept inside the analysis rather
   * than in its own column so the reasoning behind a read stays with the read.
   */
  refinements?: string[];
};

export type StyleSuggestion = {
  id: string;
  user_id: string;
  rank: number;
  name: string;
  one_liner: string | null;
  why_it_works: string | null;
  palette: Swatch[];
  key_pieces: string[];
  product_slugs: string[];
  occasions: string[];
  image_path: string | null;
  created_at: string;
  /** Every note the user has written about this direction, oldest first. */
  refinements: string[];
};

export type Profile = {
  id: string;
  display_name: string | null;
  vibe: string | null;
  occasions: string[] | null;
  budget_band: "value" | "mid" | "premium" | null;
  onboarding_stage: OnboardingStage;
  /** The photo every generated image is rendered from. Lives in the `wardrobe` bucket. */
  reference_photo_path: string | null;
  /** The full intake set, in upload order. */
  photo_paths: string[];
  analysis: ColourAnalysis | null;
  analysed_at: string | null;
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
