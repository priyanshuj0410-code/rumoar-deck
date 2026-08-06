import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogUrl, getProduct, getSavedProductIds } from "@/lib/data";
import { formatINR } from "@/lib/types";
import { SubmitButton } from "@/components/states";
import { TryOn } from "@/components/try-on";
import { toggleSavedProduct } from "../../actions";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product ? `${product.name} — RUMOAR` : "RUMOAR" };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [product, saved] = await Promise.all([getProduct(slug), getSavedProductIds()]);
  if (!product) notFound();

  const url = catalogUrl(product.image_path);
  const isSaved = saved.has(product.id);

  return (
    <div className="max-w-[980px] px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10">
      <Link
        href="/app/shop"
        className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink transition-colors"
      >
        <span className="mi text-[20px]" aria-hidden>
          arrow_back
        </span>
        Shop
      </Link>

      {/* Stacked, this page is a phone screen stretched wide: a square metre of product
          shot, then the price a scroll below it. Side by side, the picture and the reason
          to want it are read together. */}
      <div className="mt-4 @3xl:grid @3xl:grid-cols-2 @3xl:gap-x-12 @3xl:items-start">
        <div className="aspect-square bg-wash overflow-hidden flex items-center justify-center @3xl:sticky @3xl:top-10">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="mi text-[34px] text-mute" aria-hidden>
              shopping_bag
            </span>
          )}
        </div>

        <div>
          <div className="py-5 @3xl:pt-0">
            <p className="k">{product.kind}</p>
            <h1 className="text-[24px] @3xl:text-[34px] mt-1.5">{product.name}</h1>
            <p className="font-mono text-[15px] @3xl:text-[17px] mt-1">
              {formatINR(product.price_inr)}
            </p>
            {product.description && (
              <p className="text-mute text-sm leading-relaxed mt-4 max-w-[46ch]">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex gap-2.5">
            <form action={toggleSavedProduct} className="flex-1 @3xl:max-w-[280px]">
              <input type="hidden" name="product_id" value={product.id} />
              <input type="hidden" name="slug" value={product.slug} />
              <button className={`btn w-full ${isSaved ? "btn-ghost" : ""}`} aria-pressed={isSaved}>
                <span
                  className="mi text-[19px]"
                  style={{
                    fontVariationSettings: `'FILL' ${isSaved ? 1 : 0}, 'wght' 300, 'opsz' 24`,
                  }}
                  aria-hidden
                >
                  bookmark
                </span>
                {isSaved ? "Saved" : "Save"}
              </button>
            </form>
          </div>

          <TryOn slug={product.slug} name={product.name} />

          <p className="text-[11px] text-mute mt-4 leading-snug">
            Checkout isn&rsquo;t live yet. Saving tells us what to stock first.
          </p>
        </div>
      </div>
    </div>
  );
}
