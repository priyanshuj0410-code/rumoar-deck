"use client";

import { useEffect } from "react";

/**
 * The error state. Says what happened in plain words, offers the two things that
 * actually help — retry, or go somewhere that works — and never shows a stack trace.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on this in the platform logs.
    console.error("[app] route error", error.digest, error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center text-center py-20 px-6 max-w-[36ch] mx-auto">
      <span className="mi text-[30px] text-mute" aria-hidden>
        error
      </span>
      <h1 className="text-[21px] mt-4">That didn&rsquo;t load.</h1>
      <p className="text-mute text-sm leading-relaxed mt-2">
        Something broke on our side. Your wardrobe and your analysis are safe.
      </p>

      <div className="flex flex-col gap-2.5 mt-6 w-full">
        <button className="btn w-full" onClick={reset}>
          Try again
        </button>
        <a className="btn btn-ghost w-full" href="/app">
          Back to the stylist
        </a>
      </div>

      {error.digest && (
        <p className="text-[11px] text-mute/80 font-mono mt-4">Reference {error.digest}</p>
      )}
    </div>
  );
}
