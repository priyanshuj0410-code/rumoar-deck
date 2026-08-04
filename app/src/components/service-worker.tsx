"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration fails on unsupported browsers and in private windows; the app works
      // fine without it, only the offline shell is lost.
    });
  }, []);

  return null;
}
