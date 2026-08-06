"use client";

import { useState } from "react";
import { haptics } from "@/lib/platform";
import { useToast } from "./toast";

type State = "idle" | "rendering" | "done" | "error";

/**
 * "See it on me" — generates the product worn on the user's own reference photo.
 * The render is cached server-side per (user, product), so repeat taps are free.
 */
export function TryOn({ slug, name }: { slug: string; name: string }) {
  const [state, setState] = useState<State>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const toast = useToast();

  async function render() {
    setState("rendering");
    setMessage(null);
    haptics.tap();

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "tryon", productSlug: slug }),
      });
      const json = (await response.json()) as { url?: string; error?: string; message?: string };

      if (json.url) {
        setUrl(json.url);
        setState("done");
        haptics.success();
        toast("Rendered on your photo");
      } else {
        setMessage(
          json.error === "no_reference_photo"
            ? "I need a photo of you first — add one in your wardrobe."
            : (json.message ?? "Couldn't render that just now."),
        );
        setState("error");
      }
    } catch {
      setMessage("Couldn't reach the renderer. Check your connection.");
      setState("error");
    }
  }

  return (
    <div className="mt-5">
      {url && (
        <figure className="mb-3">
          <div className="aspect-[3/4] bg-wash overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${name} shown on your own photo`}
              className="w-full h-full object-cover animate-rise"
            />
          </div>
          <figcaption className="text-[11px] text-mute mt-2 leading-snug">
            Generated from your reference photo. It&rsquo;s an approximation of fit and scale,
            not a photograph of the real product on you.
          </figcaption>
        </figure>
      )}

      <button className="btn btn-ghost w-full" onClick={render} disabled={state === "rendering"}>
        <span className="mi text-[19px]" aria-hidden>
          {state === "rendering" ? "hourglass_top" : "styler"}
        </span>
        {state === "rendering" ? "Rendering…" : url ? "Render again" : "See it on me"}
      </button>

      {state === "rendering" && (
        <div className="aspect-[3/4] skel mt-3 flex items-end p-4" aria-live="polite">
          <span className="k">Putting it on you…</span>
        </div>
      )}

      {message && (
        <p role="alert" className="text-sm text-mute leading-relaxed mt-3">
          {message}
        </p>
      )}
    </div>
  );
}
