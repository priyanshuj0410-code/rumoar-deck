"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { camera, haptics, type PickedImage } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";
import { readEvents } from "@/lib/ndjson";
import { PhotoCapture } from "@/components/photo-capture";
import { ReactionBar } from "@/components/reaction-bar";
import type { ColourAnalysis, OnboardingStage, Profile, StyleSuggestion } from "@/lib/types";
import { addPhotos, finishOnboarding, savePhotos, setStage } from "./actions";

const SHOTS = [
  {
    label: "Front",
    hint: "Full body, facing the camera, arms relaxed at your sides. Plain wall and daylight if you can, and no sunglasses — this is the shot your colouring is read from.",
  },
  {
    label: "Side",
    hint: "Turn 90°, look straight ahead. Same spot, same distance, same light.",
  },
  {
    label: "Back",
    hint: "Face away from the camera. Same distance again.",
  },
];

const STAGES: OnboardingStage[] = ["photos", "analysis", "styles"];

/**
 * Anything we don't recognise restarts at the photos. Rows written by an earlier schema
 * would otherwise match no branch and render a blank screen — a dead end with no way out.
 */
function normalise(stage: OnboardingStage): OnboardingStage {
  return STAGES.includes(stage) ? stage : "photos";
}

export function Onboarding({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [stage, setLocalStage] = useState<OnboardingStage>(normalise(profile.onboarding_stage));
  const [analysis, setAnalysis] = useState<ColourAnalysis | null>(profile.analysis ?? null);
  const [pending, startTransition] = useTransition();

  function go(next: OnboardingStage) {
    // Going back to the photos invalidates the read: it describes photos that are about
    // to change, and the analysis step would otherwise show a stale result and never
    // re-run.
    if (next === "photos") setAnalysis(null);
    startTransition(async () => {
      await setStage(next);
      setLocalStage(next);
    });
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-[560px] mx-auto w-full px-5 py-6">
      <header className="flex-none">
        <span className="k">RUMOAR</span>
      </header>

      {stage === "photos" && <PhotosStep onDone={() => go("analysis")} />}

      {stage === "analysis" && (
        <AnalysisStep
          initial={analysis}
          onDone={(result) => {
            setAnalysis(result);
            go("styles");
          }}
          onBack={() => go("photos")}
          pending={pending}
        />
      )}

      {stage === "styles" && (
        <StylesStep
          onDone={() =>
            startTransition(async () => {
              await finishOnboarding();
              router.replace("/app");
            })
          }
          onBack={() => go("analysis")}
          pending={pending}
        />
      )}
    </div>
  );
}

/** One back affordance per screen, left-aligned with the body text. */
function BackLink({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-[13px] text-mute hover:text-ink transition-colors self-start"
    >
      <span className="mi text-[18px] -ml-0.5" aria-hidden>
        arrow_back
      </span>
      {label}
    </button>
  );
}

/* ───────────────────────────────────────────── photos */

/**
 * The three shots are the progress indicator. A separate bar or counter alongside them
 * is a second answer to a question the tiles already answer.
 */
function ShotTiles({
  shots,
  current,
  onPick,
}: {
  shots: (PickedImage | null)[];
  current: number;
  onPick: (index: number) => void;
}) {
  return (
    <ol className="flex-none grid grid-cols-3 gap-2 mt-5">
      {SHOTS.map((shot, index) => {
        const image = shots[index];
        const active = index === current;
        return (
          <li key={shot.label}>
            <button
              onClick={() => onPick(index)}
              disabled={!image && index > current}
              aria-current={active ? "step" : undefined}
              aria-label={
                image ? `${shot.label} — taken. Redo it.` : `${shot.label} — not taken yet`
              }
              className={`w-full text-left transition-shadow ${
                active ? "shadow-[inset_0_0_0_2px_var(--color-ink)]" : ""
              } ${!image && index > current ? "opacity-40" : ""}`}
            >
              <span className="block aspect-[3/4] bg-wash overflow-hidden relative">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.dataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="mi text-[20px] text-mute" aria-hidden>
                      person
                    </span>
                  </span>
                )}
                {image && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-ink text-paper flex items-center justify-center">
                    <span
                      className="mi text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'opsz' 24" }}
                      aria-hidden
                    >
                      check
                    </span>
                  </span>
                )}
              </span>
              <span className={`text-[11px] mt-1 block ${active ? "text-ink" : "text-mute"}`}>
                {shot.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function PhotosStep({ onDone }: { onDone: () => void }) {
  const [shots, setShots] = useState<(PickedImage | null)[]>([null, null, null]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = shots[index];
  const isLast = index === SHOTS.length - 1;
  const complete = shots.every(Boolean);

  async function finish() {
    setError(null);
    setBusy(true);

    const images = shots.filter((s): s is PickedImage => s !== null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired. Sign in again.");
      setBusy(false);
      return;
    }

    const paths: string[] = [];
    for (const [i, image] of images.entries()) {
      const path = `${user.id}/intake-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(path, image.file, { contentType: "image/jpeg" });
      if (uploadError) continue;
      paths.push(path);

      // The front shot also gets a small derivative, which is what the image model is
      // sent. Same identity, a quarter of the payload, a much faster render.
      if (i === 0) {
        const small = await camera.resize(image.file, 768);
        await supabase.storage
          .from("wardrobe")
          .upload(path.replace(/\.jpg$/, "-sm.jpg"), small, { contentType: "image/jpeg" });
      }
    }

    if (paths.length < 3) {
      setError("Those didn't all upload. Check your connection and try again.");
      setBusy(false);
      return;
    }

    // Order matters: paths[0] is the front shot and becomes the reference photo every
    // generated image is rendered from.
    const saved = await savePhotos(paths);
    setBusy(false);
    if (!saved.ok) {
      setError(`Couldn't save those: ${saved.error}`);
      return;
    }

    haptics.success();
    onDone();
  }

  return (
    <div className="flex-1 flex flex-col">
      <ShotTiles shots={shots} current={index} onPick={setIndex} />

      <PhotoCapture
        key={index}
        title={SHOTS[index].label}
        hint={SHOTS[index].hint}
        existing={current}
        onCaptured={(image) =>
          setShots((all) => all.map((shot, i) => (i === index ? image : shot)))
        }
      />

      {error && (
        <p role="alert" className="text-sm leading-relaxed mt-3">
          {error}
        </p>
      )}

      <p className="text-[11px] text-mute leading-snug mt-4">
        Your photos are private to your account and are never shown to anyone else.
      </p>

      <div className="flex gap-2.5 mt-3">
        <button
          className="btn btn-ghost flex-none px-5"
          onClick={() => setIndex(index - 1)}
          disabled={index === 0 || busy}
        >
          Back
        </button>
        <button
          className="btn flex-1"
          disabled={!current || busy}
          onClick={() => {
            haptics.tap();
            if (isLast) void finish();
            else setIndex(index + 1);
          }}
        >
          {busy ? "Uploading…" : isLast ? (complete ? "Read my colouring" : "Finish the set") : "Next"}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── analysis */

function AnalysisStep({
  initial,
  onDone,
  onBack,
  pending,
}: {
  initial: ColourAnalysis | null;
  onDone: (analysis: ColourAnalysis) => void;
  onBack: () => void;
  pending: boolean;
}) {
  const [analysis, setAnalysis] = useState<ColourAnalysis | null>(initial);
  const [prose, setProse] = useState("");
  const [status, setStatus] = useState("Opening your photos");
  const [running, setRunning] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(0);

  const run = useCallback(async (refinement?: string) => {
    setRunning(true);
    setError(null);
    setProse("");
    setStatus(refinement ? "Taking your note into account" : "Opening your photos");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refinement ? { note: refinement } : {}),
      });
      if (!response.body) throw new Error("no stream");

      await readEvents(response.body, (event) => {
        if (event.t === "text") setProse((current) => current + event.v);
        else if (event.t === "status") setStatus(event.v);
        else if (event.t === "error") setError(event.message);
        else if (event.t === "done") setAnalysis(event.payload as ColourAnalysis);
      });
    } catch {
      setError("Couldn't reach the analyser. Check your connection.");
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) void run();
  }, [initial, run]);

  /** Extra photos go straight onto the profile, so the next round sees them. */
  async function uploadMore() {
    setAdding(true);
    setError(null);
    try {
      const picked = await camera.pick();
      if (picked.length === 0) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Your session expired. Sign in again.");
        return;
      }

      const paths: string[] = [];
      for (const image of picked.slice(0, 4)) {
        const path = `${user.id}/intake-${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("wardrobe")
          .upload(path, image.file, { contentType: "image/jpeg" });
        if (!uploadError) paths.push(path);
      }

      if (paths.length === 0) {
        setError("Those didn't upload. Check your connection.");
        return;
      }

      const result = await addPhotos(paths);
      if (!result.ok) setError(result.error);
      else setAdded((count) => count + paths.length);
    } finally {
      setAdding(false);
    }
  }

  if (running) {
    return (
      <div className="flex-1 flex flex-col pt-6">
        <BackLink label="Photos" onBack={onBack} />
        <p className="k flex items-center gap-2 mt-4">
          <span className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse" aria-hidden />
          {status}
        </p>
        <h1 className="text-[28px] mt-2">Reading your colouring</h1>

        <div className="mt-5" aria-live="polite">
          {prose ? (
            <p className="text-[17px] leading-relaxed whitespace-pre-wrap">
              {prose}
              <span className="inline-block w-[2px] h-[1.1em] bg-ink align-[-2px] ml-0.5 animate-pulse" />
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <span className="skel h-4 w-[92%] block" />
              <span className="skel h-4 w-[78%] block" />
              <span className="skel h-4 w-[85%] block" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-[28px]">That didn&rsquo;t work.</h1>
        <p className="text-mute text-sm leading-relaxed mt-3">{error}</p>
        <div className="flex flex-col gap-2.5 mt-6">
          <button className="btn w-full" onClick={() => void run()}>
            Try again
          </button>
          <button className="btn btn-ghost w-full" onClick={onBack}>
            Use different photos
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const confidence = Math.round(analysis.season_confidence * 100);

  return (
    <div className="flex-1 flex flex-col pt-6">
      <BackLink label="Photos" onBack={onBack} />

      <p className="k mt-4">Your analysis</p>
      <h1 className="text-[32px] mt-2">{analysis.season}</h1>
      <p className="text-mute text-sm leading-relaxed mt-2">
        {analysis.undertone} undertone · {analysis.depth} depth · {analysis.contrast} contrast ·{" "}
        {analysis.chroma}
      </p>

      <div className="mt-6">
        <Row label="Confidence">
          <div className="flex items-center gap-3">
            <div className="h-0.5 bg-line flex-1">
              <div className="h-full bg-ink" style={{ width: `${confidence}%` }} />
            </div>
            <span className="font-mono text-[12px]">{confidence}%</span>
          </div>
          {analysis.caveat && (
            <p className="text-mute text-[13px] leading-relaxed mt-2">{analysis.caveat}</p>
          )}
        </Row>

        <Row label="Your colours">
          <ul className="grid grid-cols-4 gap-2">
            {analysis.best_colours.map((colour) => (
              <li key={colour.hex}>
                <span
                  className="block aspect-square"
                  style={{ background: colour.hex }}
                  role="img"
                  aria-label={colour.name}
                />
                <span className="text-[11px] leading-tight block mt-1">{colour.name}</span>
              </li>
            ))}
          </ul>
        </Row>

        {analysis.avoid_colours.length > 0 && (
          <Row label="Skip these">
            <ul className="flex flex-wrap gap-2">
              {analysis.avoid_colours.map((colour) => (
                <li key={colour.hex} className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 block"
                    style={{ background: colour.hex }}
                    role="img"
                    aria-label={colour.name}
                  />
                  <span className="text-[12px]">{colour.name}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}

        <Row label="Metals">
          <p className="text-sm">{analysis.metals}</p>
        </Row>

        {analysis.build.fit_notes && (
          <Row label="Fit">
            <p className="text-sm leading-relaxed">{analysis.build.fit_notes}</p>
          </Row>
        )}

        {analysis.notes && (
          <Row label="In short">
            <p className="text-sm leading-relaxed">{analysis.notes}</p>
          </Row>
        )}

        {analysis.refinements && analysis.refinements.length > 0 && (
          <Row label="Your notes so far">
            <ul className="flex flex-col gap-1.5">
              {analysis.refinements.map((entry, index) => (
                <li key={index} className="text-[13px] text-mute leading-relaxed">
                  &ldquo;{entry}&rdquo;
                </li>
              ))}
            </ul>
          </Row>
        )}

        {/* Refinement. The read is a starting point, and he knows things the photos
            cannot show — how he tans, what light the photos were taken in. */}
        <Row label="Not quite right?">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = note.trim();
              if (!trimmed) return;
              setNote("");
              void run(trimmed);
            }}
          >
            <label htmlFor="refine" className="sr-only">
              Tell the analyser what to reconsider
            </label>
            <textarea
              id="refine"
              className="field h-auto py-3 min-h-[80px] resize-none w-full"
              placeholder="I tan easily and never suit icy tones. The photos were under warm indoor light."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex flex-wrap gap-2.5 mt-2.5">
              <button className="btn btn-sm" disabled={!note.trim()}>
                Analyse again
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={uploadMore}
                disabled={adding}
              >
                <span className="mi text-[18px]" aria-hidden>
                  add_a_photo
                </span>
                {adding ? "Uploading…" : "Add more photos"}
              </button>
            </div>
            {added > 0 && (
              <p className="text-[12px] text-mute mt-2">
                {added} more {added === 1 ? "photo" : "photos"} added. They&rsquo;ll be used on the
                next run.
              </p>
            )}
            {error && (
              <p role="alert" className="text-[13px] text-mute mt-2">
                {error}
              </p>
            )}
          </form>
        </Row>

        <p className="text-[11px] text-mute leading-snug py-4">
          Colour analysis from photos is affected by lighting and camera white balance. Treat this
          as a strong starting point, not a verdict.
        </p>
      </div>

      <div className="sticky bottom-0 bg-paper pt-3 pb-[calc(8px+env(safe-area-inset-bottom))]">
        <button className="btn w-full" onClick={() => onDone(analysis)} disabled={pending}>
          Generate my styles
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="py-4 border-t border-line">
      <h2 className="k mb-2">{label}</h2>
      {children}
    </section>
  );
}
function StylesStep({
  onDone,
  onBack,
  pending,
}: {
  onDone: () => void;
  onBack: () => void;
  pending: boolean;
}) {
  const [styles, setStyles] = useState<StyleSuggestion[]>([]);
  const [status, setStatus] = useState("Reading your palette");
  const [running, setRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/styles", { method: "POST" });
        if (!response.body) throw new Error("no stream");

        await readEvents(response.body, (event) => {
          if (cancelled) return;
          if (event.t === "style") setStyles((current) => [...current, event.style as StyleSuggestion]);
          else if (event.t === "status") setStatus(event.v);
          else if (event.t === "error") setError(event.message);
        });
      } catch {
        if (!cancelled) setError("Couldn't reach the stylist. Check your connection.");
      } finally {
        if (!cancelled) setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col pt-6">
      <BackLink label="Analysis" onBack={onBack} />
      <p className="k flex items-center gap-2 mt-4">
        {running && <span className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse" aria-hidden />}
        {running ? status : "Built for your colouring"}
      </p>
      <h1 className="text-[28px] mt-2">Three directions.</h1>

      {/* The page itself scrolls. An inner overflow container here produced a second
          scrollbar inside the first — two things to drag, neither obviously the right one. */}
      <div className="mt-5 flex flex-col gap-8" aria-live="polite">
        {styles.map((style) => (
          <StyleCard key={style.id} style={style} />
        ))}

        {/* Placeholders for the directions still generating, so the page has shape. */}
        {running &&
          Array.from({ length: Math.max(0, 3 - styles.length) }).map((_, index) => (
            <div key={`pending-${index}`} className="flex flex-col gap-2">
              <span className="skel h-6 w-[52%] block" />
              <span className="skel h-4 w-[72%] block" />
              <span className="skel aspect-[3/4] w-full block mt-2" />
            </div>
          ))}

        {error && (
          <p role="alert" className="text-sm text-mute leading-relaxed">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 bg-paper pt-3 pb-[calc(8px+env(safe-area-inset-bottom))] mt-6">
        <button className="btn w-full" onClick={onDone} disabled={pending || styles.length === 0}>
          {pending ? "Finishing…" : "Open my app"}
        </button>
      </div>
    </div>
  );
}

/**
 * Image first. The rationale is real work and worth keeping, but it belongs behind a tap —
 * what he wants to know at a glance is whether he'd wear it.
 */
function StyleCard({ style }: { style: StyleSuggestion }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ message: string; reason?: string } | null>(null);
  const [open, setOpen] = useState(false);

  const render = useCallback(async () => {
    setFailed(null);
    try {
      const response = await fetch("/api/styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: style.id }),
      });
      const json = (await response.json()) as { url?: string; message?: string; reason?: string };
      if (json.url) setUrl(json.url);
      else setFailed({ message: json.message ?? "Couldn't render that one.", reason: json.reason });
    } catch {
      setFailed({ message: "Couldn't reach the renderer." });
    }
  }, [style.id]);

  // Rendering starts on its own. Asking the user to press a button for something the
  // product should obviously do is just friction.
  //
  // Staggered by rank: three simultaneous image generations compete for the same upstream
  // capacity and were pushing each other past the timeout.
  useEffect(() => {
    const timer = setTimeout(() => void render(), style.rank * 2500);
    return () => clearTimeout(timer);
  }, [render, style.rank]);

  return (
    <article>
      <div className="relative aspect-[3/4] bg-wash overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${style.name}, rendered on your own photo`}
            className="w-full h-full object-cover animate-rise"
          />
        ) : failed ? (
          // A shimmering skeleton on a permanent failure reads as "still loading forever".
          <div className="absolute inset-0 bg-wash flex flex-col items-center justify-center gap-2 text-mute">
            <span className="mi text-[28px]" aria-hidden>
              image_not_supported
            </span>
            <span className="k">Render failed</span>
          </div>
        ) : (
          <div className="absolute inset-0 skel flex items-end p-4">
            <span className="k">Dressing you…</span>
          </div>
        )}

        {url && (
          <div className="absolute inset-x-0 bottom-0 p-4 pt-10 bg-gradient-to-t from-ink/85 to-transparent text-paper">
            <h2 className="font-display text-[22px] font-semibold leading-tight">{style.name}</h2>
            {style.one_liner && <p className="text-[13px] opacity-90 mt-0.5">{style.one_liner}</p>}
          </div>
        )}

        {style.palette.length > 0 && (
          <ul className="absolute top-3 right-3 flex flex-col gap-1">
            {style.palette.map((colour) => (
              <li
                key={colour.hex}
                className="w-5 h-5 shadow-[0_1px_4px_rgba(0,0,0,.25)]"
                style={{ background: colour.hex }}
                role="img"
                aria-label={colour.name}
                title={colour.name}
              />
            ))}
          </ul>
        )}
      </div>

      {!url && (
        <h2 className="text-[21px] mt-3">
          {style.name}
          {style.one_liner && (
            <span className="block text-mute text-sm font-normal leading-relaxed mt-1">
              {style.one_liner}
            </span>
          )}
        </h2>
      )}

      {failed ? (
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-mute flex-1">{failed.message}</p>
            <button className="btn btn-ghost btn-sm flex-none" onClick={render}>
              Retry
            </button>
          </div>
          {failed.reason && (
            // The upstream reason, verbatim. Without it a render failure is a guess.
            <p className="text-[11px] text-mute/80 font-mono mt-1.5 break-all">{failed.reason}</p>
          )}
        </div>
      ) : (
        <ReactionBar subjectType="style" subjectId={style.id} title={style.name} />
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[13px] text-mute hover:text-ink transition-colors mt-1"
      >
        <span className="mi text-[18px]" aria-hidden>
          {open ? "expand_less" : "expand_more"}
        </span>
        Why this works
      </button>

      {open && (
        <div className="mt-2 animate-rise">
          {style.why_it_works && (
            <p className="text-sm leading-relaxed">{style.why_it_works}</p>
          )}
          {style.key_pieces.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {style.key_pieces.map((piece) => (
                <li key={piece} className="text-[12px] border border-line px-2 py-1">
                  {piece}
                </li>
              ))}
            </ul>
          )}
          {url && (
            <p className="text-[11px] text-mute mt-3 leading-snug">
              Generated from your photo — an impression of the direction, not real garments.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
