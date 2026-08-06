import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { catalogUrl, getLooks, signPaths } from "@/lib/data";
import { formatINR, type Product } from "@/lib/types";
import { EmptyState, IconSubmit } from "@/components/states";
import { toggleSavedLook } from "../actions";

export const metadata = { title: "Saved — RUMOAR" };

export default async function SavedPage() {
  const supabase = await createClient();

  const [looks, { data: savedRows }] = await Promise.all([
    getLooks(true),
    supabase.from("saved_products").select("products(*)"),
  ]);

  // PostgREST types an embedded one-to-one join as an array; take the first row.
  const products = ((savedRows ?? []) as unknown as { products: Product | Product[] | null }[])
    .map((row) => (Array.isArray(row.products) ? row.products[0] : row.products))
    .filter((p): p is Product => Boolean(p));

  const signed = await signPaths(
    "looks",
    looks.map((look) => look.image_path),
  );

  const empty = looks.length === 0 && products.length === 0;

  return (
    <div className="px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10 max-w-[1120px]">
      <p className="k">Saved</p>
      <h1 className="text-[26px] @3xl:text-[38px] mt-1">Kept for later</h1>

      {empty && (
        <EmptyState
          icon="bookmark"
          title="Nothing saved yet"
          body="Bookmark a piece in the shop, or keep a look the stylist builds you, and it waits here."
          action={{ label: "Browse the shop", href: "/app/shop" }}
        />
      )}

      {looks.length > 0 && (
        <section className="mt-8">
          <h2 className="k">Looks</h2>
          <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 mt-3">
            {looks.map((look) => {
              const url = look.image_path ? signed[look.image_path] : null;
              return (
                <article key={look.id} className="relative aspect-[4/5] bg-wash overflow-hidden">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={`${look.title}${look.subtitle ? ` — ${look.subtitle}` : ""}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="k absolute inset-0 flex items-center justify-center">
                      {look.title}
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-ink/80 to-transparent text-paper">
                    <b className="font-display text-[17px] block">{look.title}</b>
                    {look.subtitle && <span className="text-xs opacity-90">{look.subtitle}</span>}
                  </div>

                  <form action={toggleSavedLook} className="absolute top-2 right-2">
                    <input type="hidden" name="id" value={look.id} />
                    <input type="hidden" name="saved" value="true" />
                    <IconSubmit
                      glyph="bookmark"
                      label={`Remove ${look.title} from saved`}
                      active
                      className="w-8 h-8 bg-paper/90 flex items-center justify-center"
                    />
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="mt-10">
          <h2 className="k">Pieces</h2>
          <ul className="grid grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 gap-2.5 @4xl:gap-4 mt-3">
            {products.map((product) => {
              const url = catalogUrl(product.image_path);
              return (
                <li key={product.id} className="bg-wash">
                  <Link href={`/app/shop/${product.slug}`} className="flex flex-col">
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
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
