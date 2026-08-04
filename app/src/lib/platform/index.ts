/**
 * Platform adapter layer.
 *
 * Feature code imports from here and never touches a browser API directly. Today every
 * capability resolves to its web implementation; adding Capacitor means adding a native
 * implementation beside it and switching on `isNative()`, with no feature-code changes.
 *
 * See knowledge/architecture/overview.md § Cross-platform strategy.
 */
export { camera } from "./camera";
export { share } from "./share";
export { haptics } from "./haptics";
export { notifications } from "./notifications";
export { speech } from "./speech";
export { kv } from "./kv";

export function isNative(): boolean {
  // Capacitor injects this global. Absent on the web today.
  return typeof window !== "undefined" && "Capacitor" in window;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates display-mode and uses a non-standard flag.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as a Mac; the touch-point count gives it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
