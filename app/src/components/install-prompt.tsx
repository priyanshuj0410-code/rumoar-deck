"use client";

import { useEffect, useState } from "react";
import { isIOS, isStandalone, kv } from "@/lib/platform";

type InstallEvent = Event & { prompt: () => Promise<void> };

/**
 * Android/desktop Chrome fire `beforeinstallprompt` and we can install in place. iOS has
 * no such event — the only route is Share → Add to Home Screen, so we say that instead of
 * offering a button that cannot work.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || kv.get("install-dismissed", false)) return;

    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    kv.set("install-dismissed", true);
    setEvent(null);
    setShowIOSHint(false);
  }

  if (!event && !showIOSHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install RUMOAR"
      className="fixed z-[60] left-4 right-4 bottom-[calc(var(--spacing-tab)+env(safe-area-inset-bottom)+12px)]
                 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[360px]
                 bg-ink text-paper p-4 flex items-start gap-3"
    >
      <span className="mi text-[20px] text-peri mt-0.5" aria-hidden>
        install_mobile
      </span>
      <div className="flex-1 text-sm leading-relaxed">
        {event ? (
          <>
            <p>Install RUMOAR for full-screen access and offline wardrobe.</p>
            <div className="flex gap-2 mt-3">
              <button
                className="btn btn-sm bg-paper text-ink"
                onClick={async () => {
                  await event.prompt();
                  dismiss();
                }}
              >
                Install
              </button>
              <button className="btn btn-sm bg-transparent text-paper px-0" onClick={dismiss}>
                Not now
              </button>
            </div>
          </>
        ) : (
          <p>
            Add RUMOAR to your Home Screen: tap{" "}
            <span className="mi text-[16px] align-middle" aria-label="Share">
              ios_share
            </span>{" "}
            then <b>Add to Home Screen</b>.
          </p>
        )}
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="mi text-[20px] text-mute">
        close
      </button>
    </div>
  );
}
