"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { camera, haptics, kv } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";
import { SAMPLE_WARDROBE } from "@/lib/catalog";
import type { ItemKind, OnboardingStage, Profile } from "@/lib/types";
import { finishOnboarding, saveVibe, saveWardrobe, setReferencePhoto, setStage } from "./actions";

const AUDIO: Partial<Record<OnboardingStage | "intro" | "photos" | "wardrobe" | "done", string>> = {
  call: "/samples/audio/01-intro.mp3",
  vibe: "/samples/audio/02-vibe.mp3",
  photos: "/samples/audio/04-photos.mp3",
  wardrobe: "/samples/audio/06-wardrobe.mp3",
  reveal: "/samples/audio/09-done.mp3",
};

const OCCASIONS = [
  "Work",
  "Weekends",
  "Weddings",
  "Dates",
  "Travel",
  "Going out",
  "College",
  "Festivals",
];

type Detected = { label: string; kind: ItemKind; colour: string | null; path?: string; preview?: string };

const REVEALS = [
  {
    key: "you",
    image: "/samples/styled/you.jpg",
    title: "You, today",
    subtitle: "What you already own, worn the way you wear it.",
    markers: [] as { x: number; y: number; label: string }[],
  },
  {
    key: "catalog",
    image: "/samples/styled/catalog.jpg",
    title: "The keystone",
    subtitle: "One piece added. Nothing else changed.",
    markers: [{ x: 53, y: 46, label: "Leather sling" }],
  },
  {
    key: "peak",
    image: "/samples/styled/peak.jpg",
    title: "Peak",
    subtitle: "Where this goes once the details land.",
    markers: [
      { x: 52, y: 45, label: "Leather sling" },
      { x: 45, y: 54, label: "Clip pouch" },
    ],
  },
];

export function Onboarding({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [stage, setLocalStage] = useState<OnboardingStage>(profile.onboarding_stage);
  const [pending, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice is an enhancement, not a dependency — muted by default so a silent room is fine.
  // The stored preference is read after mount so server and client render the same thing.
  const [muted, setMuted] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMuted(kv.get("onboarding-muted", true));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) kv.set("onboarding-muted", muted);
  }, [muted, mounted]);

  useEffect(() => {
    const src = AUDIO[stage];
    if (!src || muted) return;
    const audio = new Audio(src);
    audioRef.current?.pause();
    audioRef.current = audio;
    // Autoplay is blocked until the user interacts; answering the call counts.
    audio.play().catch(() => {});
    return () => audio.pause();
  }, [stage, muted]);

  function advance(next: OnboardingStage) {
    setLocalStage(next);
    startTransition(() => void setStage(next));
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-[520px] mx-auto w-full px-5 py-6">
      <header className="flex-none flex items-center justify-between">
        <span className="k">RUMOAR</span>
        <button
          className="mi text-[20px] text-mute"
          aria-label={muted ? "Turn voice on" : "Turn voice off"}
          aria-pressed={!muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? "volume_off" : "volume_up"}
        </button>
      </header>

      {stage === "call" && <CallStep onAnswer={() => advance("vibe")} />}

      {stage === "vibe" && (
        <VibeStep
          initialName={profile.display_name ?? ""}
          onDone={(input) =>
            startTransition(async () => {
              await saveVibe(input);
              setLocalStage("photos");
            })
          }
          pending={pending}
        />
      )}

      {stage === "photos" && (
        <PhotosStep
          onDone={(detected) =>
            startTransition(async () => {
              // The wardrobe step needs the read results; stash them for this session only.
              kv.set("onboarding-detected", detected);
              await setStage("wardrobe");
              setLocalStage("wardrobe");
            })
          }
          pending={pending}
        />
      )}

      {stage === "wardrobe" && (
        <WardrobeStep
          onDone={(items) =>
            startTransition(async () => {
              await saveWardrobe(items);
              kv.remove("onboarding-detected");
              setLocalStage("reveal");
            })
          }
          pending={pending}
        />
      )}

      {stage === "reveal" && (
        <RevealStep
          onDone={() =>
            startTransition(async () => {
              await finishOnboarding();
              router.replace("/app");
            })
          }
          pending={pending}
        />
      )}
    </div>
  );
}

/* ───────────────────────────────────────────── call */

function CallStep({ onAnswer }: { onAnswer: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center py-10">
      <div className="flex flex-col items-center gap-6 mt-6">
        <div className="w-[92px] h-[92px] rounded-full bg-ink flex items-center justify-center animate-breathe">
          <b className="font-display text-[34px] text-paper">R</b>
        </div>
        <div>
          <h1 className="text-[32px]">RUMOAR</h1>
          <p className="text-mute text-sm leading-relaxed max-w-[250px] mt-2">
            Two minutes, and I&rsquo;ll know your wardrobe better than your wardrobe does.
          </p>
        </div>
      </div>

      <div className="flex gap-[60px] items-start">
        <div className="flex flex-col items-center">
          <button
            onClick={onAnswer}
            className="w-16 h-16 rounded-full border border-line flex items-center justify-center"
            aria-label="Skip the introduction"
          >
            <span className="mi text-[26px]" aria-hidden>
              call_end
            </span>
          </button>
          <span className="text-xs text-mute mt-3">Skip</span>
        </div>
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              haptics.success();
              onAnswer();
            }}
            className="w-16 h-16 rounded-full bg-ink text-paper flex items-center justify-center"
            aria-label="Answer"
          >
            <span className="mi text-[26px]" aria-hidden>
              call
            </span>
          </button>
          <span className="text-xs text-mute mt-3">Answer</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── vibe */

function VibeStep({
  initialName,
  onDone,
  pending,
}: {
  initialName: string;
  onDone: (input: { displayName: string; vibe: string; occasions: string[] }) => void;
  pending: boolean;
}) {
  const [displayName, setName] = useState(initialName);
  const [vibe, setVibe] = useState("");
  const [occasions, setOccasions] = useState<string[]>([]);

  return (
    <form
      className="flex-1 flex flex-col pt-8"
      onSubmit={(event) => {
        event.preventDefault();
        onDone({ displayName, vibe, occasions });
      }}
    >
      <p className="k">Step 1 of 4</p>
      <h1 className="text-[28px] mt-2">First, who am I talking to?</h1>

      <label htmlFor="name" className="k mt-8 mb-2 block">
        Name
      </label>
      <input
        id="name"
        className="field"
        required
        autoComplete="given-name"
        placeholder="Arjun"
        value={displayName}
        onChange={(e) => setName(e.target.value)}
      />

      <label htmlFor="vibe" className="k mt-6 mb-2 block">
        How would you describe how you dress?
      </label>
      <textarea
        id="vibe"
        className="field h-auto py-3 min-h-[92px] resize-none"
        placeholder="Mostly plain — linen shirts, sneakers. I don't want to look like I tried too hard."
        value={vibe}
        onChange={(e) => setVibe(e.target.value)}
      />

      <fieldset className="mt-6">
        <legend className="k mb-2">What are you dressing for?</legend>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((occasion) => {
            const on = occasions.includes(occasion);
            return (
              <button
                key={occasion}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  haptics.select();
                  setOccasions((current) =>
                    on ? current.filter((o) => o !== occasion) : [...current, occasion],
                  );
                }}
                className={`px-3 py-2 text-[13px] border transition-colors ${
                  on ? "bg-ink text-paper border-ink" : "border-line text-ink hover:bg-wash"
                }`}
              >
                {occasion}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button className="btn w-full mt-auto sticky bottom-0" disabled={pending || !displayName.trim()}>
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

/* ───────────────────────────────────────────── photos */

function PhotosStep({
  onDone,
  pending,
}: {
  onDone: (detected: Detected[]) => void;
  pending: boolean;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function pick() {
    const picked = await camera.pick();
    if (picked.length === 0) return;

    setBusy(true);
    setNote(null);
    const images = picked.slice(0, 4);
    setPreviews(images.map((image) => image.dataUrl));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const paths: (string | undefined)[] = [];
    if (user) {
      for (const image of images) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from("wardrobe")
          .upload(path, image.file, { contentType: "image/jpeg" });
        paths.push(error ? undefined : path);
      }

      // The first successful upload becomes the reference every generated image is
      // rendered from — the reveal shots and every later try-on.
      const reference = paths.find(Boolean);
      if (reference) await setReferencePhoto(reference);
    }

    let detected: Detected[] = [];
    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: images.map((image) => image.dataUrl) }),
      });
      const json = (await response.json()) as { items?: Detected[]; degraded?: boolean };
      detected = (json.items ?? []).map((item, index) => ({
        ...item,
        path: paths[index],
        preview: images[index]?.dataUrl,
      }));
      if (json.degraded || detected.length === 0) {
        setNote("I couldn't read those clearly — you can pick from the starter list next.");
      }
    } catch {
      setNote("I couldn't read those clearly — you can pick from the starter list next.");
    }

    setBusy(false);
    onDone(detected);
  }

  return (
    <div className="flex-1 flex flex-col pt-8">
      <p className="k">Step 2 of 4</p>
      <h1 className="text-[28px] mt-2">Show me what you actually wear.</h1>
      <p className="text-mute text-sm leading-relaxed mt-3">
        Two or three photos of you dressed normally. Not your best day — a normal one.
      </p>

      <div className="grid grid-cols-2 gap-2.5 mt-6">
        {[0, 1, 2, 3].map((slot) => (
          <div
            key={slot}
            className="aspect-[3/4] bg-wash flex items-center justify-center overflow-hidden"
          >
            {previews[slot] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[slot]} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="mi text-[24px] text-mute" aria-hidden>
                add_a_photo
              </span>
            )}
          </div>
        ))}
      </div>

      {note && <p className="text-sm text-mute mt-4 leading-relaxed">{note}</p>}

      <div className="mt-auto pt-6 flex flex-col gap-2.5">
        <button className="btn w-full" onClick={pick} disabled={busy || pending}>
          {busy ? "Reading…" : "Add photos"}
        </button>
        <button
          className="btn btn-ghost w-full"
          onClick={() => onDone([])}
          disabled={busy || pending}
        >
          I&rsquo;ll pick from a list instead
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── wardrobe */

function WardrobeStep({
  onDone,
  pending,
}: {
  onDone: (items: Detected[]) => void;
  pending: boolean;
}) {
  // localStorage is unavailable during the server render, so read it after mount to keep
  // the two renders identical.
  const [detected, setDetected] = useState<Detected[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const options: Detected[] =
    detected.length > 0
      ? detected
      : SAMPLE_WARDROBE.map((item) => ({
          label: item.label,
          kind: item.kind,
          colour: null,
          preview: `/samples/wardrobe/${item.slug}.jpg`,
        }));

  useEffect(() => {
    const stored = kv.get<Detected[]>("onboarding-detected", []);
    setDetected(stored);
    const count = stored.length > 0 ? stored.length : SAMPLE_WARDROBE.length;
    setSelected(Array.from({ length: count }, (_, index) => index));
  }, []);

  return (
    <div className="flex-1 flex flex-col pt-8 min-h-0">
      <p className="k">Step 3 of 4</p>
      <h1 className="text-[28px] mt-2">
        {detected.length > 0 ? "Did I get these right?" : "Which of these do you own?"}
      </h1>
      <p className="text-mute text-sm leading-relaxed mt-3">
        Tap anything that isn&rsquo;t yours to remove it. You can add more later.
      </p>

      <div className="grid grid-cols-2 gap-2.5 mt-6 flex-1 overflow-y-auto pb-4">
        {options.map((item, index) => {
          const on = selected.includes(index);
          return (
            <button
              key={`${item.label}-${index}`}
              aria-pressed={on}
              onClick={() => {
                haptics.select();
                setSelected((current) =>
                  on ? current.filter((i) => i !== index) : [...current, index],
                );
              }}
              className={`bg-wash text-left flex flex-col relative transition-shadow ${
                on ? "shadow-[inset_0_0_0_2.5px_var(--color-ink)]" : ""
              }`}
            >
              <div className="aspect-square overflow-hidden flex items-center justify-center">
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt=""
                    className={`w-full h-full object-cover ${on ? "opacity-95" : ""}`}
                    loading="lazy"
                  />
                ) : (
                  <span className="mi text-[22px] text-mute" aria-hidden>
                    checkroom
                  </span>
                )}
              </div>
              <span className="text-[12px] leading-tight px-2.5 py-2">{item.label}</span>
              <span
                className={`absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center ${
                  on ? "bg-ink text-paper" : "bg-paper/90 text-mute"
                }`}
                aria-hidden
              >
                <span className="mi text-[15px]">{on ? "check" : "add"}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        className="btn w-full"
        disabled={pending}
        onClick={() => onDone(selected.map((index) => options[index]))}
      >
        {pending ? "Saving…" : `Add ${selected.length} to my wardrobe`}
      </button>
    </div>
  );
}

/* ───────────────────────────────────────────── reveal */

function RevealStep({ onDone, pending }: { onDone: () => void; pending: boolean }) {
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(35);
  // Generated URL per stage, so stepping back doesn't re-render an image we already paid for.
  const [urls, setUrls] = useState<(string | null)[]>([null, null, null]);
  const [rendering, setRendering] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const current = REVEALS[step];

  // Each reveal starts where the previous one ended, so the number reads as a climb.
  useEffect(() => setRating([35, 68, 92][step]), [step]);

  useEffect(() => {
    if (urls[step]) return;
    let cancelled = false;

    (async () => {
      setRendering(true);
      setNote(null);
      try {
        const response = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "reveal", stage: step }),
        });
        const json = (await response.json()) as { url?: string; error?: string; message?: string };
        if (cancelled) return;

        if (json.url) {
          setUrls((current) => current.map((u, i) => (i === step ? json.url! : u)));
        } else {
          // Falls back to the sample imagery so the flow still reads end to end.
          setNote(
            json.error === "no_reference_photo"
              ? "Add a photo of yourself and I'll render these on you."
              : (json.message ?? "Couldn't render that one — showing an example instead."),
          );
        }
      } catch {
        if (!cancelled) setNote("Couldn't render that one — showing an example instead.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, urls]);

  const source = urls[step] ?? current.image;
  const isGenerated = Boolean(urls[step]);

  return (
    <div className="flex-1 flex flex-col pt-8 min-h-0">
      <p className="k">Step 4 of 4</p>
      <h1 className="text-[28px] mt-2">Here&rsquo;s what changes.</h1>

      <div className="relative flex-1 min-h-[240px] bg-wash overflow-hidden mt-5">
        {rendering ? (
          <div className="absolute inset-0 skel flex items-end p-4">
            <span className="k">Rendering you…</span>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source}
              alt={`${current.title} — ${current.subtitle}`}
              className="w-full h-full object-cover"
            />
            {!isGenerated && (
              <span className="absolute top-2 left-2 k bg-paper/90 px-2 py-1">Example</span>
            )}
          </>
        )}
        {!rendering &&
          !isGenerated &&
          current.markers.map((marker) => (
          <span
            key={marker.label}
            title={marker.label}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full
                       bg-paper border-2 border-ink flex items-center justify-center
                       shadow-[0_2px_8px_rgba(0,0,0,.3)]"
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          >
            <span className="sr-only">{marker.label}</span>
            <span className="mi text-[15px]" aria-hidden>
              add
            </span>
          </span>
        ))}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-ink/80 to-transparent text-paper">
          <b className="font-display text-[19px] block">{current.title}</b>
          <span className="text-[12.5px] opacity-90">{current.subtitle}</span>
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-end justify-between">
          <span className="font-display text-[44px] leading-[.9] tracking-[-.02em]">
            {rating}
            <small className="text-[20px] font-medium">/100</small>
          </span>
          <span className="k">Fit score</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={rating}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Fit score"
          className="h-0.5 bg-line mt-3"
        >
          <div className="h-full bg-ink transition-all duration-500" style={{ width: `${rating}%` }} />
        </div>
      </div>

      {note && <p className="text-sm text-mute leading-relaxed mt-3">{note}</p>}

      <button
        className="btn w-full mt-6"
        disabled={pending || rendering}
        onClick={() => {
          haptics.tap();
          if (step < REVEALS.length - 1) {
            setStep(step + 1);
          } else {
            onDone();
          }
        }}
      >
        {pending
          ? "Finishing…"
          : rendering
            ? "Rendering…"
            : step < REVEALS.length - 1
              ? "Next"
              : "Open my app"}
      </button>
    </div>
  );
}
