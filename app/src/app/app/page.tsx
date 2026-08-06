import Link from "next/link";
import { getLooks, getProfile, getWardrobe, signPaths } from "@/lib/data";

export const metadata = { title: "Stylist — RUMOAR" };

/**
 * The content column at /app. On mobile the stylist covers this entirely (see AppShell);
 * on desktop it sits alongside the conversation as the "today" surface.
 */
export default async function TodayPage() {
  const [profile, looks, wardrobe] = await Promise.all([getProfile(), getLooks(), getWardrobe()]);
  const signed = await signPaths(
    "looks",
    looks.map((look) => look.image_path),
  );

  return (
    <div className="px-6 mx-auto @2xl:px-8 @4xl:px-10 py-8 @4xl:py-12 max-w-[1120px]">
      <p className="k">Today</p>
      <h1 className="text-[32px] @3xl:text-[46px] mt-2 @3xl:mt-3">
        {profile?.display_name ? `Evening, ${profile.display_name}` : "Evening"}
      </h1>
      <p className="text-mute text-sm leading-relaxed mt-3 max-w-[52ch]">
        {wardrobe.length > 0
          ? `${wardrobe.length} pieces on file. Ask for a look and I'll build it from what you own.`
          : "Your wardrobe is empty. Add a few pieces and I can start styling properly."}
      </p>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link href="/app/wardrobe" className="btn btn-ghost btn-sm">
          <span className="mi text-[18px]" aria-hidden>
            checkroom
          </span>
          Wardrobe
        </Link>
        <Link href="/app/shop" className="btn btn-ghost btn-sm">
          <span className="mi text-[18px]" aria-hidden>
            shopping_bag
          </span>
          Shop
        </Link>
      </div>

      <h2 className="text-[21px] @3xl:text-[26px] mt-12">Your looks</h2>
      {looks.length === 0 ? (
        <p className="text-mute text-sm leading-relaxed mt-3 max-w-[46ch]">
          Nothing styled yet. Tell the stylist where you&rsquo;re headed and the looks will
          collect here.
        </p>
      ) : (
        <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 mt-4">
          {looks.slice(0, 6).map((look) => {
            const url = look.image_path ? signed[look.image_path] : null;
            return (
              <article key={look.id} className="relative aspect-[4/5] bg-wash overflow-hidden">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`${look.title}${look.subtitle ? ` — ${look.subtitle}` : ""}`}
                    className="w-full h-full object-cover"
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
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
