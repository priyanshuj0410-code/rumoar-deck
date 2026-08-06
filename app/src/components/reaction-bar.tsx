"use client";

import { useState } from "react";
import { haptics, share } from "@/lib/platform";
import { useToast } from "./toast";

export type ReactionKind = "like" | "dislike" | "save" | "share";
export type SubjectType = "style" | "look";

/**
 * Material Symbols has no `*_border` variants — those are Material Icons names, and an
 * unknown ligature renders as its own literal text. One ligature per icon; the FILL axis
 * carries the state.
 */
const ICONS: Record<ReactionKind, { glyph: string; label: string }> = {
  like: { glyph: "favorite", label: "Like" },
  dislike: { glyph: "thumb_down", label: "Not for me" },
  save: { glyph: "bookmark", label: "Save" },
  share: { glyph: "ios_share", label: "Share" },
};

/** Material Symbols is a variable font: fill the glyph rather than swapping it. */
export function fillAxis(on: boolean) {
  return { fontVariationSettings: `'FILL' ${on ? 1 : 0}, 'wght' ${on ? 400 : 300}, 'opsz' 24` };
}

/**
 * Feedback on a generated image. Every tap is training signal for what to generate next,
 * so it posts immediately rather than waiting for a save action — and it stays optimistic
 * so the tap never feels laggy on a slow connection.
 */
export function ReactionBar({
  subjectType,
  subjectId,
  title,
  initial = [],
}: {
  subjectType: SubjectType;
  subjectId: string;
  title: string;
  initial?: ReactionKind[];
}) {
  const [active, setActive] = useState<Set<ReactionKind>>(new Set(initial));
  const [shared, setShared] = useState(false);
  const toast = useToast();

  async function send(kind: ReactionKind, on: boolean) {
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectType, subjectId, kind, on }),
    }).catch(() => {
      // Feedback is not worth an error dialog. The optimistic state stands.
    });
  }

  function toggle(kind: ReactionKind) {
    haptics.select();
    setActive((current) => {
      const next = new Set(current);
      const on = !next.has(kind);

      if (on) {
        next.add(kind);
        if (kind === "save") toast("Saved to your looks");
        if (kind === "dislike") toast("Noted — you'll see less of this");
        // A like and a dislike are one opinion, not two.
        if (kind === "like") next.delete("dislike");
        if (kind === "dislike") next.delete("like");
      } else {
        next.delete(kind);
      }

      void send(kind, on);
      return next;
    });
  }

  async function onShare() {
    haptics.tap();
    const ok = await share.send({
      title: `${title} — RUMOAR`,
      text: `${title}, styled for me by RUMOAR.`,
      url: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    if (ok) {
      setShared(true);
      void send("share", true);
      toast(share.available() ? "Shared" : "Link copied");
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {(["like", "dislike", "save"] as const).map((kind) => {
        const on = active.has(kind);
        return (
          <button
            key={kind}
            onClick={() => toggle(kind)}
            aria-pressed={on}
            aria-label={ICONS[kind].label}
            title={ICONS[kind].label}
            className={`w-10 h-10 flex items-center justify-center transition-colors
                        ${on ? "text-ink" : "text-mute hover:text-ink"}`}
          >
            <span
              className="mi text-[22px]"
              // Fill is a shape change, not just a colour change, so the state survives
              // greyscale and colour blindness.
              style={fillAxis(on)}
              aria-hidden
            >
              {ICONS[kind].glyph}
            </span>
          </button>
        );
      })}

      <button
        onClick={onShare}
        aria-label={ICONS.share.label}
        title={ICONS.share.label}
        className={`w-10 h-10 flex items-center justify-center transition-colors ml-auto
                    ${shared ? "text-ink" : "text-mute hover:text-ink"}`}
      >
        <span className="mi text-[21px]" aria-hidden>
          {ICONS.share.glyph}
        </span>
      </button>
    </div>
  );
}
