import Link from "next/link";
import { catalogUrl, getProducts, getSavedProductIds } from "@/lib/data";
import { formatINR } from "@/lib/types";
import { EmptyState, IconSubmit } from "@/components/states";
import { toggleSavedProduct } from "../actions";

export const metadata = { title: "Shop — RUMOAR" };

export default async function ShopPage() {
  const [products, saved] = await Promise.all([getProducts(), getSavedProductIds()]);

  return (
    <div className="px-4 sm:px-6 xl:px-8 py-6 max-w-[880px]">
      <p className="k">Shop</p>
      <h1 className="text-[26px] mt-1">The keystones</h1>
      <p className="text-mute text-sm leading-relaxed mt-2 max-w-[46ch]">
        Nine pieces, chosen so one of them finishes most of what you already own.
      </p>

      {products.length === 0 ? (
        <EmptyState
          icon="shopping_bag"
          title="The catalogue is empty"
          body="Nothing has been loaded yet. Run the seed script and the nine keystones appear here."
        />
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
          {products.map((product) => {
            const url = catalogUrl(product.image_path);
            const isSaved = saved.has(product.id);
            return (
              <li key={product.id} className="bg-wash flex flex-col relative">
                <Link href={`/app/shop/${product.slug}`} className="flex flex-col flex-1">
                  <div className="aspect-square overflow-hidden flex items-center justify-center">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="mi text-[30px] text-mute" aria-hidden>
                        shopping_bag
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <b className="text-[13.5px] font-semibold block leading-tight">
                      {product.name}
                    </b>
                    <span className="font-mono text-[12px] text-mute mt-1 block">
                      {formatINR(product.price_inr)}
                    </span>
                  </div>
                </Link>

                <form action={toggleSavedProduct} className="absolute top-1.5 right-1.5">
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="slug" value={product.slug} />
                  <IconSubmit
                    glyph="bookmark"
                    label={isSaved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
                    active={isSaved}
                    className={`w-8 h-8 flex items-center justify-center ${
                      isSaved ? "bg-ink text-paper" : "bg-paper/90 text-mute hover:text-ink"
                    }`}
                  />
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
