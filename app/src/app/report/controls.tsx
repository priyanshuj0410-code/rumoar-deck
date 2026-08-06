"use client";

import { useEffect, useRef, useState } from "react";
import { isIOS, isStandalone, share } from "@/lib/platform";
import { useToast } from "@/components/toast";
import type { ColourAnalysis } from "@/lib/types";

/**
 * The save path. Printing before the webfonts resolve produces a sheet with fallback
 * metrics, whose line counts differ from the design — which is exactly how a one-page
 * document becomes two.
 */
export function Controls({
  analysis,
  name,
}: {
  analysis: ColourAnalysis;
  name: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const frame = useRef<HTMLDivElement | null>(null);
  const toast = useToast();

  // The sheet is a fixed 210mm wide. On a phone that overflows, so it is scaled to the
  // viewport rather than allowed to introduce a horizontal scrollbar.
  useEffect(() => {
    frame.current = document.querySelector(".frame");
    const sheet = document.querySelector(".sheet") as HTMLElement | null;
    if (!frame.current || !sheet) return;

    const fit = () => {
      const width = frame.current!.clientWidth;
      const scale = Math.min(1, width / sheet.offsetWidth);
      sheet.style.setProperty("--fit", String(scale));
      frame.current!.style.height = `${sheet.offsetHeight * scale}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  async function save() {
    setSaving(true);
    // The filename the browser offers comes from the document title, and a report called
    // "localhost" is a report nobody finds again.
    const previous = document.title;
    document.title = `RUMOAR — ${name ?? "Colour report"} — ${analysis.season}`;
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
      window.print();
    } finally {
      document.title = previous;
      setSaving(false);
    }
  }

  async function copy() {
    const text = [
      `RUMOAR — ${analysis.season}`,
      `${analysis.undertone} · ${analysis.depth} · ${analysis.contrast} · ${analysis.chroma}`,
      "",
      "WEAR",
      ...analysis.best_colours.map((c) => `${c.hex.toUpperCase()}  ${c.name}`),
      "",
      "AVOID",
      ...analysis.avoid_colours.map((c) => `${c.hex.toUpperCase()}  ${c.name}`),
      "",
      `METAL  ${analysis.metals}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast("Palette copied");
    } catch {
      toast("Couldn't copy that");
    }
  }

  // Printing from an installed PWA on iOS has no route to the share sheet, so the escape
  // is opening the same page in Safari.
  const trapped = isIOS() && isStandalone();

  return (
    <div className="no-print">
      <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
        {trapped ? (
          <a
            href="/report"
            target="_blank"
            rel="noreferrer"
            className="btn w-full sm:w-auto sm:px-8"
          >
            <span className="mi text-[19px]" aria-hidden>
              open_in_new
            </span>
            Open in Safari to save
          </a>
        ) : (
          <button
            className="btn w-full sm:w-auto sm:px-8"
            onClick={save}
            disabled={saving}
          >
            <span className="mi text-[19px]" aria-hidden>
              print
            </span>
            {saving ? "Preparing…" : "Save as PDF"}
          </button>
        )}

        <button
          className="btn btn-ghost w-full sm:w-auto sm:px-6"
          onClick={copy}
        >
          <span className="mi text-[18px]" aria-hidden>
            content_copy
          </span>
          Copy the palette
        </button>

        <button
          className="btn btn-ghost w-full sm:w-auto sm:px-6"
          onClick={async () => {
            const ok = await share.send({
              title: "My RUMOAR colour report",
              text: `${analysis.season} — my colour and fit read.`,
              url:
                typeof window !== "undefined"
                  ? window.location.href
                  : undefined,
            });
            if (ok) toast(share.available() ? "Shared" : "Link copied");
          }}
        >
          <span className="mi text-[18px]" aria-hidden>
            ios_share
          </span>
          Send the link
        </button>
      </div>

      {/* No CSS suppresses Chrome's own margin headers. Saying so is the only fix. */}
      <p className="text-[12px] text-mute leading-relaxed mt-3">
        It prints on one side of A4. In Chrome, switch off &ldquo;Headers and
        footers&rdquo; under More settings, and leave &ldquo;Background
        graphics&rdquo; as it is — the colours are drawn, not painted on.
      </p>
    </div>
  );
}
