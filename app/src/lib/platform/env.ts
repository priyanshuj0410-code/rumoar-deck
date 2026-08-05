/**
 * Environment probes. Kept out of index.ts because the capability modules need them —
 * importing back from the barrel would make the module graph circular.
 */

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
