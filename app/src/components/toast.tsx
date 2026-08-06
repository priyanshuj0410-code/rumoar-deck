"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { haptics } from "@/lib/platform";

type Tone = "done" | "warn";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** Confirmation for actions whose result is off-screen or too small to notice. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: Tone = "done") => {
    if (timer.current) clearTimeout(timer.current);
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
    if (tone === "done") haptics.success();
    else haptics.warn();
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={show}>
      {children}

      {/*
        `role="status"` rather than `alert`: these confirm, they do not interrupt. A live
        region means the message reaches a screen reader even though it is transient and
        visually peripheral.
      */}
      <div
        role="status"
        aria-live="polite"
        className="fixed z-[80] left-4 right-4 bottom-[calc(var(--spacing-tab)+env(safe-area-inset-bottom)+12px)]
                   lg:left-auto lg:right-6 lg:bottom-6 lg:w-[320px] pointer-events-none"
      >
        {toast && (
          <div
            key={toast.id}
            className="bg-ink text-paper px-4 py-3 flex items-center gap-2.5 text-sm animate-toast
                       shadow-[0_18px_40px_-18px_rgba(23,23,27,0.6)]"
          >
            <span
              className={`mi text-[18px] ${toast.tone === "done" ? "text-peri" : "text-paper"}`}
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'opsz' 24" }}
              aria-hidden
            >
              {toast.tone === "done" ? "check_circle" : "error"}
            </span>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
