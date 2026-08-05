import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogUrl, getProduct, getSavedProductIds } from "@/lib/data";
import { formatINR } from "@/lib/types";
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
    <div className="max-w-[720px] px-4 sm:px-6 xl:px-8 py-6">
      <Link
        href="/app/shop"
        className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink transition-colors"
      >
        <span className="mi text-[20px]" aria-hidden>
          arrow_back
        </span>
        Shop
      </Link>

      <div className="aspect-square bg-wash overflow-hidden mt-4 flex items-center justify-center">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="mi text-[34px] text-mute" aria-hidden>
            shopping_bag
          </span>
        )}
      </div>

      <div className="py-5">
        <p className="k">{product.kind}</p>
        <h1 className="text-[24px] mt-1.5">{product.name}</h1>
        <p className="font-mono text-[15px] mt-1">{formatINR(product.price_inr)}</p>
        {product.description && (
          <p className="text-mute text-sm leading-relaxed mt-4">{product.description}</p>
        )}
      </div>

      <div className="flex gap-2.5">
        <form action={toggleSavedProduct} className="flex-1">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
          <button className={`btn w-full ${isSaved ? "btn-ghost" : ""}`} aria-pressed={isSaved}>
            <span
              className="mi text-[19px]"
              style={{ fontVariationSettings: `'FILL' ${isSaved ? 1 : 0}, 'wght' 300, 'opsz' 24` }}
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
  );
}
