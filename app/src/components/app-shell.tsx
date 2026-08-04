"use client";

import { usePathname } from "next/navigation";
import { Rail, TabBar } from "./nav";

/**
 * One stylist instance, positioned by breakpoint.
 *
 * Mobile: the stylist is a tab — it covers the content column at /app and is hidden
 * elsewhere. Desktop (≥1120px): it is a permanent right-hand column and the content
 * column always shows the current route. See knowledge/design.md § Layout.
 */
export function AppShell({
  children,
  stylist,
}: {
  children: React.ReactNode;
  stylist: React.ReactNode;
}) {
  const pathname = usePathname();
  const atStylist = pathname === "/app";

  return (
    <div className="flex min-h-dvh">
      <Rail />

      <main
        className={`flex-1 min-w-0 pb-[calc(var(--spacing-tab)+env(safe-area-inset-bottom))] lg:pb-0 ${
          atStylist ? "hidden lg:block" : ""
        }`}
      >
        {children}
      </main>

      <aside
        aria-label="Stylist"
        className={`${atStylist ? "flex" : "hidden"} lg:flex flex-col
                    w-full lg:w-stylist flex-none lg:border-l lg:border-line
                    pb-[calc(var(--spacing-tab)+env(safe-area-inset-bottom))] lg:pb-0`}
      >
        {stylist}
      </aside>

      <TabBar />
    </div>
  );
}
