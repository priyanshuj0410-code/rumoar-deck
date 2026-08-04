"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptics } from "@/lib/platform";

export const NAV = [
  { href: "/app", icon: "graphic_eq", label: "Stylist" },
  { href: "/app/wardrobe", icon: "checkroom", label: "Wardrobe" },
  { href: "/app/saved", icon: "bookmark", label: "Saved" },
  { href: "/app/shop", icon: "shopping_bag", label: "Shop" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

/** Mobile: bottom tab bar. Hidden from 1120px up, where the rail takes over. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-50 flex justify-around lg:hidden
                 pt-[9px] pb-[calc(14px+env(safe-area-inset-bottom))]
                 shadow-[0_-0.5px_0_rgba(23,23,27,.08)]"
    >
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => haptics.tap()}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-[3px] px-3 py-[3px] text-[10px] font-medium
                        min-w-[64px] transition-colors ${active ? "text-ink" : "text-mute"}`}
          >
            <span className="mi text-[23px]" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop: 88px icon rail. */
export function Rail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="hidden lg:flex flex-col items-center gap-1 w-rail flex-none border-r border-line py-6"
    >
      <span className="k mb-6 [writing-mode:vertical-rl] rotate-180 tracking-[.3em]">RUMOAR</span>

      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 w-[68px] py-3 text-[10px] font-medium
                        transition-colors ${active ? "text-ink bg-wash" : "text-mute hover:text-ink"}`}
          >
            <span className="mi text-[24px]" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}

      <Link
        href="/app/settings"
        aria-current={pathname === "/app/settings" ? "page" : undefined}
        className={`mt-auto flex flex-col items-center gap-1 w-[68px] py-3 text-[10px] font-medium
                    transition-colors ${
                      pathname === "/app/settings" ? "text-ink bg-wash" : "text-mute hover:text-ink"
                    }`}
      >
        <span className="mi text-[24px]" aria-hidden>
          settings
        </span>
        Settings
      </Link>
    </nav>
  );
}
