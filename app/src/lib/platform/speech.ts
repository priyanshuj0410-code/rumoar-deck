type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function ctor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export const speech = {
  /**
   * Absent on iOS Safari and Firefox. Callers must hide the mic rather than show a
   * control that does nothing — see knowledge/architecture/overview.md § Known limits.
   */
  available(): boolean {
    return ctor() !== null;
  },

  /** Resolves with the transcript, or null if unsupported / nothing heard. */
  listenOnce(lang = "en-IN"): Promise<string | null> {
    const Ctor = ctor();
    if (!Ctor) return Promise.resolve(null);

    return new Promise((resolve) => {
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      rec.onresult = (e) => finish(e.results[0]?.[0]?.transcript?.trim() || null);
      rec.onerror = () => finish(null);
      rec.onend = () => finish(null);
      try {
        rec.start();
      } catch {
        finish(null);
      }
      setTimeout(() => {
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
        finish(null);
      }, 12_000);
    });
  },
};
