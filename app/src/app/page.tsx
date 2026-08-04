import Link from "next/link";
import { getUser } from "@/lib/data";

const STEPS = [
  {
    icon: "photo_camera",
    title: "Show him what you own",
    body: "Photograph your wardrobe once. RUMOAR reads it, names every piece, and remembers.",
  },
  {
    icon: "graphic_eq",
    title: "Talk like you would to a friend",
    body: "Wedding in Jaipur, 40 degrees, don't want to look like everyone else. He answers in a sentence.",
  },
  {
    icon: "shopping_bag",
    title: "Buy only what finishes the fit",
    body: "One keystone accessory beats ten. He'll tell you when you already have enough.",
  },
];

export default async function LandingPage() {
  const user = await getUser();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-8 py-5">
        <span className="k">RUMOAR</span>
        <Link href={user ? "/app" : "/sign-in"} className="btn btn-sm">
          {user ? "Open the app" : "Sign in"}
        </Link>
      </header>

      <main className="flex-1">
        <section className="px-6 sm:px-8 pt-10 pb-16 sm:pt-20 sm:pb-24 max-w-[1100px] mx-auto">
          <p className="k">Men&rsquo;s accessories · India</p>
          <h1 className="text-[40px] sm:text-[64px] leading-[1.02] mt-4 max-w-[16ch]">
            Your stylist, always on.
          </h1>
          <p className="text-mute text-base sm:text-lg leading-relaxed mt-6 max-w-[46ch]">
            A quarter of men who buy clothes say they&rsquo;d dress better if they knew how.
            RUMOAR learns what you already own, then tells you the one thing that finishes it.
          </p>
          <div className="flex flex-wrap gap-3 mt-10">
            <Link href={user ? "/app" : "/sign-in"} className="btn">
              {user ? "Open the app" : "Start with your wardrobe"}
            </Link>
            <a href="#how" className="btn btn-ghost">
              How it works
            </a>
          </div>
        </section>

        <section
          id="how"
          className="border-t border-line px-6 sm:px-8 py-14 sm:py-20 max-w-[1100px] mx-auto"
        >
          <div className="grid gap-10 sm:gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.title}>
                <span className="mi text-[26px]" aria-hidden>
                  {step.icon}
                </span>
                <h2 className="text-[21px] mt-4">{step.title}</h2>
                <p className="text-mute text-sm leading-relaxed mt-2">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-6 sm:px-8 py-6 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <span className="k">RUMOAR</span>
        <span className="text-mute text-xs">Works on Android, iPhone and desktop.</span>
      </footer>
    </div>
  );
}
