export const share = {
  available(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
  },

  /** Returns false when the user cancelled or sharing is unavailable. */
  async send(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
    if (!this.available()) {
      if (data.url && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(data.url);
        return true;
      }
      return false;
    }
    try {
      await navigator.share(data);
      return true;
    } catch {
      return false;
    }
  },
};
