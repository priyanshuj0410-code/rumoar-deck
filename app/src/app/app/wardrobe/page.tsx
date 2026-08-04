import { getWardrobe, signPaths } from "@/lib/data";
import { AddWardrobeItem } from "@/components/add-wardrobe-item";
import { deleteWardrobeItem } from "../actions";

export const metadata = { title: "Wardrobe — RUMOAR" };

export default async function WardrobePage() {
  const items = await getWardrobe();
  const signed = await signPaths(
    "wardrobe",
    items.map((item) => item.image_path),
  );

  return (
    <div className="px-4 sm:px-6 xl:px-8 py-6 max-w-[880px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="k">Wardrobe</p>
          <h1 className="text-[26px] mt-1">
            {items.length} {items.length === 1 ? "piece" : "pieces"}
          </h1>
        </div>
        <AddWardrobeItem />
      </div>

      {items.length === 0 ? (
        <p className="text-mute text-sm leading-relaxed text-center py-16 px-6 max-w-[36ch] mx-auto">
          Nothing here yet. Photograph a few pieces and RUMOAR will name them for you.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-6">
          {items.map((item) => {
            const url = item.image_path ? signed[item.image_path] : null;
            return (
              <li key={item.id} className="bg-wash flex flex-col relative group">
                <div className="aspect-square overflow-hidden flex items-center justify-center">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={item.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="mi text-[22px] text-mute" aria-hidden>
                      checkroom
                    </span>
                  )}
                </div>
                <div className="px-2.5 py-2 flex-1">
                  <span className="text-[12px] leading-tight block">{item.label}</span>
                  <span className="k text-[9px]">{item.kind}</span>
                </div>

                <form action={deleteWardrobeItem} className="absolute top-1.5 right-1.5">
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    aria-label={`Remove ${item.label}`}
                    className="w-7 h-7 bg-paper/90 flex items-center justify-center text-mute
                               hover:text-ink transition-colors"
                  >
                    <span className="mi text-[15px]" aria-hidden>
                      close
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
