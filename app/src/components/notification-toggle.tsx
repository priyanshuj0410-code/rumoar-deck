"use client";

import { useEffect, useState } from "react";
import { notifications, isIOS, isStandalone } from "@/lib/platform";

export function NotificationToggle() {
  const [state, setState] = useState<NotificationPermission | "unsupported">("unsupported");
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    setState(notifications.permission());
    setNeedsInstall(isIOS() && !isStandalone());
  }, []);

  return (
    <section className="mt-10">
      <h2 className="k">Notifications</h2>

      {needsInstall ? (
        <p className="text-mute text-sm leading-relaxed mt-2">
          On iPhone, notifications only work once RUMOAR is added to your Home Screen. Add it,
          then come back here.
        </p>
      ) : state === "unsupported" ? (
        <p className="text-mute text-sm leading-relaxed mt-2">
          This browser doesn&rsquo;t support notifications.
        </p>
      ) : state === "granted" ? (
        <p className="text-mute text-sm leading-relaxed mt-2">
          On. RUMOAR will nudge you when a look is ready.
        </p>
      ) : state === "denied" ? (
        <p className="text-mute text-sm leading-relaxed mt-2">
          Blocked in your browser settings. Re-enable them there to turn this back on.
        </p>
      ) : (
        <button
          className="btn btn-ghost btn-sm mt-3"
          onClick={async () => {
            await notifications.request();
            setState(notifications.permission());
          }}
        >
          Turn on notifications
        </button>
      )}
    </section>
  );
}
