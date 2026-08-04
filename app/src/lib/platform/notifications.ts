import { isIOS, isStandalone } from "./index";

export const notifications = {
  /**
   * iOS only exposes the Notification API to a PWA installed to the home screen. Asking
   * in a browser tab there throws or silently fails, so we gate on install first.
   */
  supported(): boolean {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (isIOS() && !isStandalone()) return false;
    return true;
  },

  permission(): NotificationPermission | "unsupported" {
    if (!this.supported()) return "unsupported";
    return Notification.permission;
  },

  async request(): Promise<boolean> {
    if (!this.supported()) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  },
};
