"use client";

import { useEffect, useRef } from "react";

/**
 * A dialog for the one thing it is for. Used where an input would otherwise sit on the
 * page permanently, competing with the content it is about.
 *
 * Handles the three things a hand-rolled modal usually forgets: Escape closes it, focus
 * moves into it and cannot leave while it is open, and the page behind it does not scroll.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Focus the first field, or the panel itself when there isn't one.
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    requestAnimationFrame(() => (focusable()[0] ?? panel.current)?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Trap: wrap at both ends rather than letting focus escape to the page behind.
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      restoreTo.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 animate-fade"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative w-full sm:max-w-[440px] bg-paper p-5
                   pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 animate-sheet"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[19px]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="mi text-[22px] text-mute hover:text-ink transition-colors -mr-1 -mt-0.5"
          >
            close
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
