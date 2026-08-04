"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { speech, haptics } from "@/lib/platform";
import { formatINR, type Message, type Product } from "@/lib/types";

const CHIPS = [
  "What works for a Jaipur wedding in 40°?",
  "Style my olive shirt for Friday drinks",
  "What's the one thing my wardrobe is missing?",
  "Office, but not boring — what do I add?",
];

type Props = {
  initialMessages: Message[];
  products: Record<string, Product & { imageUrl: string | null }>;
  name: string | null;
};

export function Stylist({ initialMessages, products, name }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCanListen(speech.available()), []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setDraft("");
    setPending(true);
    haptics.tap();

    // Optimistic: the thread should never look like it swallowed the message.
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      user_id: "",
      role: "user",
      content: trimmed,
      meta: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const json = (await response.json()) as { message?: Message };
      if (json.message) setMessages((prev) => [...prev, json.message!]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          user_id: "",
          role: "assistant",
          content: "That didn't send. Check your connection and try again.",
          meta: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function mic() {
    if (listening) return;
    setListening(true);
    const heard = await speech.listenOnce();
    setListening(false);
    if (heard) void send(heard);
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-dvh lg:h-auto lg:flex-1 min-h-0 bg-paper">
      <header className="flex-none glass px-4 py-3 border-b border-line">
        <p className="k">Stylist</p>
        <h2 className="text-[19px] mt-1">
          {name ? `Evening, ${name}` : "RUMOAR"}
        </h2>
      </header>

      <div
        ref={logRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        role="log"
        aria-live="polite"
        aria-label="Conversation with your stylist"
      >
        {empty && (
          <div className="my-auto">
            <p className="text-mute text-sm leading-relaxed">
              Tell me where you&rsquo;re going and what the day looks like. I&rsquo;ll style it
              from what you already own.
            </p>
            <div className="flex flex-col gap-2 mt-5">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="text-left text-sm border border-line px-3 py-2.5 hover:bg-wash transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="animate-bubin">
            <div
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] bg-ink text-paper px-3.5 py-2.5 text-sm leading-relaxed"
                  : "mr-auto max-w-[92%] bg-wash px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line"
              }
            >
              {message.content}
            </div>

            {message.meta?.productSlugs && message.meta.productSlugs.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 mt-2.5 mr-auto max-w-[92%]">
                {message.meta.productSlugs
                  .map((slug) => products[slug])
                  .filter(Boolean)
                  .map((product) => (
                    <Link
                      key={product.id}
                      href={`/app/shop/${product.slug}`}
                      className="bg-wash flex flex-col"
                    >
                      <div className="aspect-square bg-wash overflow-hidden">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="mi text-[26px] text-mute w-full h-full" aria-hidden>
                            image
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <b className="text-[13px] font-semibold block leading-tight">
                          {product.name}
                        </b>
                        <span className="font-mono text-[12px] text-mute">
                          {formatINR(product.price_inr)}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        ))}

        {pending && (
          <div className="mr-auto bg-wash px-3.5 py-3 flex gap-1.5" aria-label="Thinking">
            {[0, 0.15, 0.3].map((delay) => (
              <i
                key={delay}
                className="w-1.5 h-1.5 bg-mute rounded-full animate-pulse"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-none border-t border-line px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:pb-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <label htmlFor="stylist-input" className="sr-only">
            Message your stylist
          </label>
          <input
            id="stylist-input"
            className="field flex-1"
            placeholder="Where are you going?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
          />
          {canListen && (
            <button
              type="button"
              onClick={mic}
              aria-label={listening ? "Listening" : "Speak instead"}
              className={`btn w-btn px-0 flex-none ${listening ? "bg-volt" : "btn-ghost"}`}
            >
              <span className="mi text-[21px]" aria-hidden>
                {listening ? "graphic_eq" : "mic"}
              </span>
            </button>
          )}
          <button
            type="submit"
            className="btn w-btn px-0 flex-none"
            disabled={pending || !draft.trim()}
            aria-label="Send"
          >
            <span className="mi text-[21px]" aria-hidden>
              arrow_upward
            </span>
          </button>
        </form>
        <p className="text-[11px] text-mute mt-2 leading-snug">
          RUMOAR is an AI stylist and can get things wrong. Prices and stock are shown from the
          catalogue, not from him.
        </p>
      </div>
    </div>
  );
}
