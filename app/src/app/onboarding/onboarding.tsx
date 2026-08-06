"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { camera, haptics, type PickedImage } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";
import { readEvents } from "@/lib/ndjson";
import { PhotoCapture } from "@/components/photo-capture";
import { Modal } from "@/components/modal";
import { ReactionBar } from "@/components/reaction-bar";
import {
  BODY_SHAPES,
  FACE_SHAPES,
  ShapeReading,
} from "@/components/shape-diagram";
import { readableOn, SWATCH_RING } from "@/lib/colour";
import type {
  ColourAnalysis,
  OnboardingStage,
  Profile,
  StyleSuggestion,
} from "@/lib/types";
import { addPhotos, finishOnboarding, savePhotos, setStage } from "./actions";

const SHOTS = [
  {
    label: "Front",
    hint: "Full body, facing the camera. Plain wall, daylight if you can, no sunglasses.",
  },
  { label: "Side", hint: "Turn 90°. Same spot, same distance, same light." },
  { label: "Back", hint: "Facing away. Same spot and distance again." },
];

const STAGES: OnboardingStage[] = ["photos", "analysis", "styles"];

/**
 * Anything we don't recognise restarts at the photos. Rows written by an earlier schema
 * would otherwise match no branch and render a blank screen — a dead end with no way out.
 */
function normalise(stage: OnboardingStage): OnboardingStage {
  return STAGES.includes(stage) ? stage : "photos";
}

/** Instant, not smooth: a new screen should already be at its top, not travel there. */
function scrollToTop() {
  if (typeof window !== "undefined")
    window.scrollTo({ top: 0, behavior: "auto" });
}

export function Onboarding({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [stage, setLocalStage] = useState<OnboardingStage>(
    normalise(profile.onboarding_stage),
  );
  const [analysis, setAnalysis] = useState<ColourAnalysis | null>(
    profile.analysis ?? null,
  );
  const [pending, startTransition] = useTransition();

  function go(next: OnboardingStage) {
    // Going back to the photos invalidates the read: it describes photos that are about
    // to change, and the analysis step would otherwise show a stale result and never
    // re-run.
    if (next === "photos") setAnalysis(null);
    scrollToTop();
    startTransition(async () => {
      await setStage(next);
      setLocalStage(next);
    });
  }

  return (
    <div className="min-h-dvh flex flex-col w-full mx-auto max-w-[440px] lg:max-w-[1160px] xl:max-w-[1320px] px-5 lg:px-10 py-6 lg:py-10">
      {stage === "photos" && (
        <div className="flex-1 flex flex-col justify-center py-6">
          <PhotosStep onDone={() => go("analysis")} />
        </div>
      )}

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
type Mismatch = { index: number; detected: string };

function ShotTiles({
  shots,
  current,
  flagged = [],
  onPick,
}: {
  shots: (PickedImage | null)[];
  current: number;
  /** Shots the angle check has queried. The strip is where "which one" gets answered. */
  flagged?: Mismatch[];
  onPick: (index: number) => void;
}) {
  return (
    <ol className="flex-none flex gap-2 mb-6">
      {SHOTS.map((shot, index) => {
        const image = shots[index];
        const active = index === current;
        const flag = flagged.find((m) => m.index === index);
        return (
          <li key={shot.label}>
            <button
              onClick={() => onPick(index)}
              aria-current={active ? "step" : undefined}
              aria-label={
                flag
                  ? `${shot.label} — taken, but it looks like a ${flag.detected} shot. Go to it.`
                  : image
                    ? `${shot.label} — taken. Go to it.`
                    : `${shot.label} — not taken yet`
              }
              className="block text-left group"
            >
              {/* The ring goes on the image only. Wrapping the label in it made the
                  pair read as a text input with the shot name typed into it. */}
              <span
                // These are the only way back on this screen, so they answer to a hover
                // rather than sitting there looking like a progress readout.
                className={`block w-[58px] lg:w-[68px] aspect-[3/4] bg-wash overflow-hidden relative
                            transition-shadow ${
                              active
                                ? "shadow-[inset_0_0_0_2px_var(--color-ink)]"
                                : "group-hover:shadow-[inset_0_0_0_1px_var(--color-mute)]"
                            }`}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.dataUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="mi text-[16px] text-mute" aria-hidden>
                      person
                    </span>
                  </span>
                )}
                {image && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-ink text-paper flex items-center justify-center">
                    <span
                      className="mi text-[11px]"
                      style={{
                        fontVariationSettings:
                          "'FILL' 1, 'wght' 500, 'opsz' 20",
                      }}
                      aria-hidden
                    >
                      {flag ? "question_mark" : "check"}
                    </span>
                  </span>
                )}
              </span>
              <span
                // A queried tile keeps its ink label even when it is not the step you are
                // on, so two outstanding flags are legible across the strip at a glance.
                className={`text-[10px] lg:text-[11px] mt-1 block tracking-wide transition-colors ${
                  active || flag ? "text-ink" : "text-mute group-hover:text-ink"
                }`}
              >
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
  const [shots, setShots] = useState<(PickedImage | null)[]>([
    null,
    null,
    null,
  ]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);
  // A judgement, not a cache: only an explicit "Keep it" lands here, so a photo the user
  // has already vouched for is never queried twice, while a *replacement* is new evidence
  // and gets checked like any other shot.
  const [kept, setKept] = useState<number[]>([]);

  const current = shots[index];
  const isLast = index === SHOTS.length - 1;
  const complete = shots.every(Boolean);

  const flag = mismatches.find((m) => m.index === index) ?? null;
  const seat = mismatches.findIndex((m) => m.index === index) + 1;
  // Two shots each detected as the other's angle are not bad photographs — they are the
  // right photographs in the wrong order, and that is a reorder, not a re-shoot.
  const swapped =
    mismatches.length === 2 &&
    mismatches[0].detected.toLowerCase() ===
      SHOTS[mismatches[1].index].label.toLowerCase() &&
    mismatches[1].detected.toLowerCase() ===
      SHOTS[mismatches[0].index].label.toLowerCase();

  /**
   * Confirms each shot is the angle it claims to be. A side photo filed as the front
   * skews every read built on it, and nothing downstream would ever reveal that.
   */
  async function checkAngles(images: PickedImage[]): Promise<boolean> {
    try {
      const response = await fetch("/api/verify-shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: images.map((image) => image.dataUrl) }),
      });
      const json = (await response.json()) as {
        checked?: boolean;
        mismatches?: Mismatch[];
      };
      if (!json.checked || !json.mismatches?.length) return true;

      const fresh = json.mismatches.filter((m) => !kept.includes(m.index));
      if (!fresh.length) return true;

      // The tiles are the navigation, so the question and the highlighted tile have to
      // agree — and the photograph being questioned has to be the one on screen.
      setMismatches(fresh);
      setIndex(fresh[0].index);
      return false;
    } catch {
      // The check is a safeguard, not a gate.
      return true;
    }
  }

  async function finish(skipCheck = false) {
    setError(null);
    setMismatches([]);
    setBusy(true);

    const images = shots.filter((s): s is PickedImage => s !== null);

    if (!skipCheck && !(await checkAngles(images))) {
      setBusy(false);
      return;
    }

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
          .upload(path.replace(/\.jpg$/, "-sm.jpg"), small, {
            contentType: "image/jpeg",
          });
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

  /** Drops the flag on `at` and moves to whatever is still outstanding. */
  function clearFlag(at: number, vouched: boolean) {
    const rest = mismatches.filter((m) => m.index !== at);
    if (vouched) setKept((all) => (all.includes(at) ? all : [...all, at]));
    setMismatches(rest);
    if (rest.length > 0) {
      setIndex(rest[0].index);
      scrollToTop();
    }
  }

  const label = SHOTS[index].label;

  return (
    // No back link. The tiles are the navigation on this screen — a second way back
    // beside them only made the two disagree about which one meant "previous".
    <div className="flex flex-col">
      {/* The angle check does not add a region to this screen. It changes what the four
          slots in the flow pane say — eyebrow, title, hint, actions — and jumps to the
          photograph in question, so the evidence is already on the left. */}
      <PhotoCapture
        key={index}
        title={
          flag
            ? swapped
              ? "Are these the right way round?"
              : `Is this your ${label.toLowerCase()} shot?`
            : label
        }
        hint={
          flag
            ? swapped
              ? `${SHOTS[mismatches[0].index].label} and ${SHOTS[mismatches[1].index].label} look swapped. Nothing needs re-shooting — we can put them the right way round.`
              : `It reads as a ${flag.detected} shot. If we've got that wrong, keep it and carry on.`
            : SHOTS[index].hint
        }
        band={
          flag ? `Filed as ${label} · reads as ${flag.detected}` : undefined
        }
        problem={error}
        // The tiles travel with the copy: on desktop they belong in the flow pane beside
        // the subject, not stranded above the whole layout.
        lead={
          <>
            <ShotTiles
              shots={shots}
              current={index}
              flagged={mismatches}
              onPick={(next) => {
                setIndex(next);
                scrollToTop();
              }}
            />
            {flag && (
              <p className="k mb-2" role="status">
                Second look
                {mismatches.length > 1 && !swapped
                  ? ` · ${seat} of ${mismatches.length}`
                  : ""}
                <span className="sr-only">
                  {swapped
                    ? ". Two photos look swapped. You can put them the right way round, or keep them as they are."
                    : `. Your ${label.toLowerCase()} photo looks like a ${flag.detected} shot. You can retake it, or keep it.`}
                </span>
              </p>
            )}
          </>
        }
        actions={
          flag ? (
            <div className="flex flex-col gap-2.5">
              {swapped ? (
                <>
                  <button
                    className="btn w-full"
                    onClick={() => {
                      const [a, b] = mismatches;
                      setShots((all) =>
                        all.map((shot, i) =>
                          i === a.index
                            ? all[b.index]
                            : i === b.index
                              ? all[a.index]
                              : shot,
                        ),
                      );
                      setMismatches([]);
                    }}
                  >
                    <span className="mi text-[19px]" aria-hidden>
                      swap_horiz
                    </span>
                    Swap them
                  </button>
                  <button
                    className="btn btn-ghost w-full"
                    onClick={() => {
                      setKept(mismatches.map((m) => m.index));
                      setMismatches([]);
                    }}
                  >
                    Keep them as they are
                  </button>
                </>
              ) : (
                <>
                  {/* Retaking drops back into the ordinary empty step, which is where the
                      instruction for getting this shot right already lives. */}
                  <button
                    className="btn w-full"
                    onClick={() => {
                      setShots((all) =>
                        all.map((shot, i) => (i === index ? null : shot)),
                      );
                      clearFlag(index, false);
                    }}
                  >
                    Retake {label.toLowerCase()}
                  </button>
                  <button
                    className="btn btn-ghost w-full"
                    onClick={() => clearFlag(index, true)}
                  >
                    Keep it
                  </button>
                </>
              )}
            </div>
          ) : undefined
        }
        existing={current}
        busy={busy}
        nextLabel={complete ? "Start my analysis" : "Next"}
        onCaptured={(image) =>
          setShots((all) => all.map((shot, i) => (i === index ? image : shot)))
        }
        onNext={() => {
          haptics.tap();
          if (isLast || complete) void finish();
          else {
            setIndex(index + 1);
            scrollToTop();
          }
        }}
      />
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
  // Gemini streams in very coarse chunks — often the whole reply in two frames — so the
  // raw stream still lands as a wall of text. This buffers what has arrived and reveals
  // it at a readable pace, which is what makes it feel like it is being written.
  const buffered = useRef("");
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRevealed((shown) => {
        if (shown >= buffered.current.length) return shown;
        // Faster when the backlog is long, so a late burst still catches up.
        const backlog = buffered.current.length - shown;
        return shown + Math.max(2, Math.ceil(backlog / 18));
      });
    }, 30);
    return () => clearInterval(timer);
  }, []);
  const [running, setRunning] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [refining, setRefining] = useState(false);
  const [added, setAdded] = useState(0);

  const run = useCallback(async (refinement?: string) => {
    setRunning(true);
    setError(null);
    setProse("");
    buffered.current = "";
    setRevealed(0);
    setStatus(
      refinement ? "Taking your note into account" : "Opening your photos",
    );

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refinement ? { note: refinement } : {}),
      });
      if (!response.body) throw new Error("no stream");

      await readEvents(response.body, (event) => {
        if (event.t === "text") {
          buffered.current += event.v;
          setProse(buffered.current);
        } else if (event.t === "status") setStatus(event.v);
        else if (event.t === "error") setError(event.message);
        else if (event.t === "done")
          setAnalysis(event.payload as ColourAnalysis);
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

  if (running || revealed < buffered.current.length) {
    return (
      <div className="flex-1 flex flex-col pt-6">
        <BackLink label="Photos" onBack={onBack} />
        <p className="k flex items-center gap-2 mt-4">
          <span
            className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse"
            aria-hidden
          />
          {status}
        </p>
        <h1 className="text-[28px] lg:text-[52px] mt-2 lg:mt-3">Reading you</h1>

        {/* A measure, not a width. Across 1080px of desktop this prose would be unreadable. */}
        <div className="mt-5 lg:mt-8 lg:max-w-[60ch]" aria-live="polite">
          {revealed > 0 ? (
            <p className="text-[17px] lg:text-[19px] leading-relaxed whitespace-pre-wrap">
              {prose.slice(0, revealed)}
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
      <div className="flex-1 flex flex-col justify-center lg:max-w-[440px]">
        <h1 className="text-[28px] lg:text-[38px]">That didn&rsquo;t work.</h1>
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
  // The model returns anywhere from five to a dozen colours. A fixed six-across band
  // strands the seventh alone on a second row with a metre of white beside it, so the
  // band takes its column count from the palette and only wraps once it has to.
  const swatches = analysis.best_colours.length;
  const band = swatches <= 8 ? swatches : Math.ceil(swatches / 2);

  return (
    <div className="flex-1 flex flex-col pt-6">
      <BackLink label="Photos" onBack={onBack} />

      {/* The season is the headline and the confidence is its byline, so on a wide screen
          they share one band rather than queueing up a narrow column. */}
      <header className="mt-4 lg:mt-8 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-x-14 lg:items-end">
        <div>
          <p className="k">Your analysis</p>
          <h1 className="text-[32px] lg:text-[68px] leading-[1.05] lg:leading-[0.94] mt-2 lg:mt-4">
            {analysis.season}
          </h1>
          <p className="text-mute text-sm lg:text-[15px] leading-relaxed mt-2 lg:mt-4">
            {analysis.undertone} undertone · {analysis.depth} depth ·{" "}
            {analysis.contrast} contrast · {analysis.chroma}
          </p>
        </div>

        <section className="mt-6 lg:mt-0 py-4 lg:py-0 border-t lg:border-t-0 border-line">
          <h2 className="k mb-2">Confidence</h2>
          <div className="flex items-center gap-3">
            <div className="h-0.5 bg-line flex-1">
              <div
                className="h-full bg-ink"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="font-mono text-[12px]">{confidence}%</span>
          </div>
          {analysis.caveat && (
            <p className="text-mute text-[13px] leading-relaxed mt-2">
              {analysis.caveat}
            </p>
          )}
        </section>
      </header>

      {/* Colour is the whole point of the reading, so on desktop it takes the full measure
          instead of being rationed a column. */}
      <section className="py-4 lg:pt-10 lg:pb-8 border-t border-line lg:mt-8">
        <h2 className="k mb-2 lg:mb-4">Your colours</h2>
        <ul
          className="grid grid-cols-4 gap-2 lg:gap-3
                     lg:[grid-template-columns:repeat(var(--band),minmax(0,1fr))]"
          style={{ "--band": band } as React.CSSProperties}
        >
          {analysis.best_colours.map((colour) => (
            <li key={colour.hex}>
              <span
                className="block aspect-square lg:aspect-[4/5]"
                // A hairline ring, not a border: it renders the pale swatches visible
                // without inseting them, and disappears against the dark ones.
                style={{ background: colour.hex, boxShadow: SWATCH_RING }}
                role="img"
                aria-label={colour.name}
              />
              <span className="text-[11px] lg:text-[13px] leading-tight block mt-1 lg:mt-2">
                {colour.name}
              </span>
              <span className="hidden lg:block font-mono text-[10px] text-mute mt-0.5">
                {colour.hex.toUpperCase()}
              </span>
            </li>
          ))}
        </ul>

        {analysis.avoid_colours.length > 0 && (
          <div className="mt-5 lg:mt-8 lg:flex lg:items-baseline lg:gap-6">
            <h3 className="k lg:shrink-0 lg:pt-1">Skip these</h3>
            <ul className="flex flex-wrap gap-2 lg:gap-5 mt-2 lg:mt-0">
              {analysis.avoid_colours.map((colour) => (
                <li
                  key={colour.hex}
                  className="flex items-center gap-1.5 lg:gap-2"
                >
                  <span
                    className="w-4 h-4 lg:w-5 lg:h-5 block"
                    style={{ background: colour.hex, boxShadow: SWATCH_RING }}
                    role="img"
                    aria-label={colour.name}
                  />
                  <span className="text-[12px] lg:text-[13px]">
                    {colour.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="lg:columns-2 lg:gap-x-14">
        <Row label="Metals">
          <p className="text-sm">{analysis.metals}</p>
        </Row>

        {analysis.build.fit_notes && (
          <Row label="Fit">
            <p className="text-sm leading-relaxed">
              {analysis.build.fit_notes}
            </p>
          </Row>
        )}

        {/* Each reading carries its consequence. The shape on its own is trivia; what it
            means for a shoulder line or a collar spread is the product. */}
        {analysis.physique?.body_shape && (
          <Row label="Build">
            <ShapeReading
              shapes={BODY_SHAPES}
              value={analysis.physique.body_shape}
              note={analysis.physique.body_shape_styling}
              otherLabel="See the other builds"
            />
          </Row>
        )}

        {analysis.physique?.face_shape && (
          <Row label="Face">
            <ShapeReading
              shapes={FACE_SHAPES}
              value={analysis.physique.face_shape}
              note={analysis.physique.face_shape_styling}
              otherLabel="See the other face shapes"
            />
          </Row>
        )}

        {analysis.physique?.hair?.colour && (
          <Row label="Hair">
            <p className="text-[13px] text-mute">
              {[
                analysis.physique.hair.colour,
                analysis.physique.hair.length,
                analysis.physique.hair.texture,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-sm leading-relaxed mt-1">
              {analysis.physique.hair.styling}
            </p>
          </Row>
        )}

        {analysis.physique?.beard?.present &&
          analysis.physique.beard.colour && (
            <Row label="Beard">
              <p className="text-[13px] text-mute">
                {[
                  analysis.physique.beard.colour,
                  analysis.physique.beard.length,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-sm leading-relaxed mt-1">
                {analysis.physique.beard.styling}
              </p>
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
                <li
                  key={index}
                  className="text-[13px] text-mute leading-relaxed"
                >
                  &ldquo;{entry}&rdquo;
                </li>
              ))}
            </ul>
          </Row>
        )}

        {/* Behind a button. Permanently open, this input sat under the reading it was
            about and made the screen feel like a form rather than a result. */}
        <Row label="Not quite right?">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setRefining(true)}
          >
            <span className="mi text-[18px]" aria-hidden>
              tune
            </span>
            Refine the analysis
          </button>
          {added > 0 && (
            <p className="text-[12px] text-mute mt-2">
              {added} more {added === 1 ? "photo" : "photos"} added.
              They&rsquo;ll be used on the next run.
            </p>
          )}
        </Row>

        <Modal
          open={refining}
          title="Refine the analysis"
          onClose={() => setRefining(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = note.trim();
              if (!trimmed) return;
              setNote("");
              setRefining(false);
              scrollToTop();
              void run(trimmed);
            }}
          >
            <p className="text-mute text-sm leading-relaxed">
              Tell me what to reconsider. You know things the photos can&rsquo;t
              show.
            </p>
            <label htmlFor="refine" className="sr-only">
              What should the analysis reconsider?
            </label>
            <textarea
              id="refine"
              className="field h-auto py-3 min-h-[96px] resize-none w-full mt-3"
              placeholder="I tan easily and never suit icy tones. The photos were under warm indoor light."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex flex-col gap-2.5 mt-3">
              <button className="btn w-full" disabled={!note.trim()}>
                Analyse again
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={uploadMore}
                disabled={adding}
              >
                <span className="mi text-[18px]" aria-hidden>
                  add_a_photo
                </span>
                {adding ? "Uploading…" : "Add more photos"}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-[13px] text-mute mt-3">
                {error}
              </p>
            )}
          </form>
        </Modal>

        <p className="text-[11px] text-mute leading-snug py-4">
          Colour analysis from photos is affected by lighting and camera white
          balance. Treat this as a strong starting point, not a verdict.
        </p>
      </div>

      <div
        className="sticky bottom-0 bg-paper pt-3 pb-[calc(8px+env(safe-area-inset-bottom))]
                   lg:border-t lg:border-line lg:pt-5 lg:pb-8 lg:flex lg:justify-end"
      >
        <button
          className="btn w-full lg:w-auto lg:px-14"
          onClick={() => onDone(analysis)}
          disabled={pending}
        >
          Generate my styles
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // break-inside-avoid so a section is never split down the middle of a column.
    <section className="py-4 border-t border-line break-inside-avoid">
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
          if (event.t === "style")
            setStyles((current) => [
              ...current,
              event.style as StyleSuggestion,
            ]);
          else if (event.t === "status") setStatus(event.v);
          else if (event.t === "error") setError(event.message);
        });
      } catch {
        if (!cancelled)
          setError("Couldn't reach the stylist. Check your connection.");
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
        {running && (
          <span
            className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse"
            aria-hidden
          />
        )}
        {running ? status : "Built for your colouring"}
      </p>
      <h1 className="text-[28px] lg:text-[56px] lg:leading-[0.98] mt-2 lg:mt-3">
        Three directions.
      </h1>

      {/* The page itself scrolls. An inner overflow container here produced a second
          scrollbar inside the first — two things to drag, neither obviously the right one. */}
      <div
        className="mt-5 lg:mt-10 flex flex-col gap-8
                   lg:grid lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14 lg:items-start"
        aria-live="polite"
      >
        {styles.map((style) => (
          <StyleCard key={style.id} style={style} />
        ))}

        {/* Placeholders for the directions still generating, so the page has shape. */}
        {running &&
          Array.from({ length: Math.max(0, 3 - styles.length) }).map(
            (_, index) => (
              <div key={`pending-${index}`} className="flex flex-col gap-2">
                <span className="skel h-6 w-[52%] block" />
                <span className="skel h-4 w-[72%] block" />
                <span className="skel aspect-[3/4] w-full block mt-2" />
              </div>
            ),
          )}

        {error && (
          <p role="alert" className="text-sm text-mute leading-relaxed">
            {error}
          </p>
        )}
      </div>

      <div
        className="sticky bottom-0 bg-paper pt-3 pb-[calc(8px+env(safe-area-inset-bottom))] mt-6
                   lg:border-t lg:border-line lg:pt-5 lg:pb-8 lg:mt-12 lg:flex lg:justify-end"
      >
        <button
          className="btn w-full lg:w-auto lg:px-14"
          onClick={onDone}
          disabled={pending || styles.length === 0}
        >
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
function StyleCard({ style: initial }: { style: StyleSuggestion }) {
  const [style, setStyle] = useState(initial);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState<{
    message: string;
    reason?: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reworking, setReworking] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);

  const render = useCallback(async () => {
    setFailed(null);
    try {
      const response = await fetch("/api/styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: style.id }),
      });
      const json = (await response.json()) as {
        url?: string;
        message?: string;
        reason?: string;
      };
      if (json.url) setUrl(json.url);
      else
        setFailed({
          message: json.message ?? "Couldn't render that one.",
          reason: json.reason,
        });
    } catch {
      setFailed({ message: "Couldn't reach the renderer." });
    }
  }, [style.id]);

  async function rework() {
    const trimmed = note.trim();
    if (!trimmed) return;

    setReworking(true);
    setFailed(null);
    try {
      const response = await fetch("/api/styles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: style.id, note: trimmed }),
      });
      const json = (await response.json()) as {
        style?: StyleSuggestion;
        message?: string;
      };
      if (json.style) {
        setStyle(json.style);
        setNote("");
        // The old render belongs to the old direction; drop it and draw the new one.
        setUrl(null);
        void render();
      } else {
        setFailed({ message: json.message ?? "Couldn't rework that one." });
      }
    } catch {
      setFailed({ message: "Couldn't reach the stylist." });
    } finally {
      setReworking(false);
    }
  }

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
      </div>

      {/* The palette is the direction, not a garnish on it: full width, named, and
          carrying its own hex. Twenty-pixel chips in the photo's corner read as
          decoration. */}
      {style.palette.length > 0 && (
        <ul
          className="grid"
          role="list"
          style={{
            gridTemplateColumns: `repeat(${style.palette.length}, minmax(0, 1fr))`,
          }}
        >
          {style.palette.map((colour) => (
            <li
              key={colour.hex}
              // No ring here. These blocks butt against each other at full width, so a
              // hairline on each draws a grid of lines through the band — the swatches
              // already separate themselves by being different colours. The ring stays
              // on the analysis swatches, which sit apart on white and need an edge.
              className="min-h-[76px] p-2.5 flex flex-col justify-end"
              style={{ background: colour.hex, color: readableOn(colour.hex) }}
            >
              <span className="text-[12px] font-medium leading-tight">
                {colour.name}
              </span>
              <span className="font-mono text-[10px] opacity-70 mt-0.5">
                {colour.hex}
              </span>
            </li>
          ))}
        </ul>
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
            <p className="text-[11px] text-mute/80 font-mono mt-1.5 break-all">
              {failed.reason}
            </p>
          )}
        </div>
      ) : (
        <ReactionBar
          subjectType="style"
          subjectId={style.id}
          title={style.name}
          extra={{
            glyph: "auto_awesome",
            label: `Rework ${style.name}`,
            onClick: () => setReworkOpen(true),
            busy: reworking,
          }}
        />
      )}

      <h2 className="text-[21px] mt-2">{style.name}</h2>
      {style.one_liner && (
        <p className="text-mute text-sm leading-relaxed mt-1">
          {style.one_liner}
        </p>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[13px] text-mute hover:text-ink transition-colors mt-2"
      >
        <span className="mi text-[18px]" aria-hidden>
          {open ? "expand_less" : "expand_more"}
        </span>
        Why this works
      </button>

      {/* One direction at a time. A note here reworks this card only — the other two
          are someone else's argument and should not move because of it. */}
      <Modal
        open={reworkOpen}
        title={`Rework ${style.name}`}
        onClose={() => setReworkOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setReworkOpen(false);
            void rework();
          }}
        >
          <p className="text-mute text-sm leading-relaxed">
            Say what to change. Only this direction moves — the other two stay
            as they are.
          </p>
          <label htmlFor={`note-${style.id}`} className="sr-only">
            Suggest a change to {style.name}
          </label>
          <textarea
            id={`note-${style.id}`}
            className="field h-auto py-3 min-h-[96px] resize-none w-full mt-3"
            placeholder="Too formal for me — same colours, softer shapes."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={reworking}
          />
          <button
            className="btn w-full mt-3"
            disabled={!note.trim() || reworking}
          >
            {reworking ? "Reworking…" : "Rework this direction"}
          </button>
        </form>
      </Modal>

      {style.refinements?.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {style.refinements.map((entry, index) => (
            <li key={index} className="text-[12px] text-mute leading-relaxed">
              &ldquo;{entry}&rdquo;
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-2 animate-rise">
          {style.why_it_works && (
            <p className="text-sm leading-relaxed">{style.why_it_works}</p>
          )}
          {style.key_pieces.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {style.key_pieces.map((piece) => (
                <li
                  key={piece}
                  className="text-[12px] border border-line px-2 py-1"
                >
                  {piece}
                </li>
              ))}
            </ul>
          )}
          {url && (
            <p className="text-[11px] text-mute mt-3 leading-snug">
              Generated from your photo — an impression of the direction, not
              real garments.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
