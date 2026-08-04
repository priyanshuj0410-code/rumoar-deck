"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { camera, haptics } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";
import type { ColourAnalysis, OnboardingStage, Profile, StyleSuggestion } from "@/lib/types";
import { finishOnboarding, savePhotos, setStage } from "./actions";

const SHOTS = [
  { label: "Front", hint: "Face the camera, arms relaxed at your sides." },
  { label: "Side", hint: "Turn 90°, look straight ahead." },
  { label: "Back", hint: "Face away, same distance." },
];

export function Onboarding({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [stage, setLocalStage] = useState<OnboardingStage>(profile.onboarding_stage);
  const [analysis, setAnalysis] = useState<ColourAnalysis | null>(profile.analysis);
  const [pending, startTransition] = useTransition();

  return (
    <div className="min-h-dvh flex flex-col max-w-[560px] mx-auto w-full px-5 py-6">
      <header className="flex-none flex items-center justify-between">
        <span className="k">RUMOAR</span>
        <span className="k">
          {stage === "photos" ? "1 of 3" : stage === "analysis" ? "2 of 3" : "3 of 3"}
        </span>
      </header>

      {stage === "photos" && (
        <PhotosStep
          onDone={() =>
            startTransition(async () => {
              await setStage("analysis");
              setLocalStage("analysis");
            })
          }
        />
      )}

      {stage === "analysis" && (
        <AnalysisStep
          initial={analysis}
          onDone={(result) => {
            setAnalysis(result);
            startTransition(async () => {
              await setStage("styles");
              setLocalStage("styles");
            });
          }}
          onRetake={() =>
            startTransition(async () => {
              await setStage("photos");
              setLocalStage("photos");
            })
          }
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
          pending={pending}
        />
      )}
    </div>
  );
}

/* ───────────────────────────────────────────── 1 · photos */

function PhotosStep({ onDone }: { onDone: () => void }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const picked = await camera.pick();
    if (picked.length === 0) return;

    setBusy(true);
    const images = picked.slice(0, 6);
    setPreviews(images.map((image) => image.dataUrl));

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
    for (const image of images) {
      const path = `${user.id}/intake-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(path, image.file, { contentType: "image/jpeg" });
      if (!uploadError) paths.push(path);
    }

    if (paths.length < 3) {
      setError("Those didn't all upload. Try again with three or more photos.");
      setBusy(false);
      return;
    }

    await savePhotos(paths);
    haptics.success();
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex-1 flex flex-col pt-8">
      <h1 className="text-[28px]">Three to six photos of you.</h1>
      <p className="text-mute text-sm leading-relaxed mt-3">
        Full body — front, side and back, like mugshots. Plain wall, daylight if you can, no
        sunglasses. I read your colouring and proportions from these; nothing else works as well.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {SHOTS.map((shot, index) => (
          <li key={shot.label} className="flex gap-3 items-start">
            <span className="font-mono text-[11px] text-mute mt-0.5 w-4">{index + 1}</span>
            <div>
              <b className="text-[13.5px] font-semibold">{shot.label}</b>
              <p className="text-mute text-[13px] leading-relaxed">{shot.hint}</p>
            </div>
          </li>
        ))}
      </ul>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-6">
          {previews.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={src}
              alt=""
              className="aspect-[3/4] w-full object-cover bg-wash"
            />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm mt-4 leading-relaxed">
          {error}
        </p>
      )}

      <p className="text-[11px] text-mute leading-snug mt-auto pt-6">
        Your photos are private to your account and are never shown to anyone else.
      </p>

      <button className="btn w-full mt-3" onClick={pick} disabled={busy}>
        {busy ? "Uploading…" : "Choose photos"}
      </button>
    </div>
  );
}

/* ───────────────────────────────────────────── 2 · analysis */

function AnalysisStep({
  initial,
  onDone,
  onRetake,
  pending,
}: {
  initial: ColourAnalysis | null;
  onDone: (analysis: ColourAnalysis) => void;
  onRetake: () => void;
  pending: boolean;
}) {
  const [analysis, setAnalysis] = useState<ColourAnalysis | null>(initial);
  const [running, setRunning] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (analysis) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/analyze", { method: "POST" });
        const json = (await response.json()) as {
          analysis?: ColourAnalysis;
          message?: string;
        };
        if (cancelled) return;
        if (json.analysis) setAnalysis(json.analysis);
        else setError(json.message ?? "Couldn't read those photos.");
      } catch {
        if (!cancelled) setError("Couldn't reach the analyser. Check your connection.");
      } finally {
        if (!cancelled) setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysis]);

  if (running) {
    return (
      <div className="flex-1 flex flex-col justify-center" aria-live="polite">
        <div className="w-full h-1 bg-line overflow-hidden">
          <div className="h-full w-1/3 bg-ink animate-pulse" />
        </div>
        <h1 className="text-[28px] mt-6">Reading your colouring…</h1>
        <p className="text-mute text-sm leading-relaxed mt-3">
          Undertone, depth, contrast, then the season. Fifteen seconds or so.
        </p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-[28px]">That didn&rsquo;t work.</h1>
        <p className="text-mute text-sm leading-relaxed mt-3">{error}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button className="btn w-full" onClick={onRetake}>
            Use different photos
          </button>
        </div>
      </div>
    );
  }

  const confidence = Math.round(analysis.season_confidence * 100);

  return (
    <div className="flex-1 flex flex-col pt-8 min-h-0">
      <p className="k">Your analysis</p>
      <h1 className="text-[32px] mt-2">{analysis.season}</h1>
      <p className="text-mute text-sm leading-relaxed mt-2">
        {analysis.undertone} undertone · {analysis.depth} depth · {analysis.contrast} contrast ·{" "}
        {analysis.chroma}
      </p>

      <div className="flex-1 overflow-y-auto mt-6 -mx-1 px-1">
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

        <p className="text-[11px] text-mute leading-snug py-4">
          Colour analysis from photos is affected by lighting and camera white balance. Treat this
          as a strong starting point, not a verdict.
        </p>
      </div>

      <button className="btn w-full mt-3" onClick={() => onDone(analysis)} disabled={pending}>
        Show me three styles
      </button>
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

/* ───────────────────────────────────────────── 3 · styles */

function StylesStep({ onDone, pending }: { onDone: () => void; pending: boolean }) {
  const [styles, setStyles] = useState<StyleSuggestion[]>([]);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/styles", { method: "POST" });
        const json = (await response.json()) as { styles?: StyleSuggestion[]; message?: string };
        if (cancelled) return;
        if (json.styles?.length) setStyles(json.styles);
        else setError(json.message ?? "Couldn't put those together.");
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

  if (running) {
    return (
      <div className="flex-1 flex flex-col justify-center" aria-live="polite">
        <div className="w-full h-1 bg-line overflow-hidden">
          <div className="h-full w-1/2 bg-ink animate-pulse" />
        </div>
        <h1 className="text-[28px] mt-6">Building your three directions…</h1>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pt-8 min-h-0">
      <p className="k">Built for your colouring</p>
      <h1 className="text-[28px] mt-2">Three directions.</h1>

      {error && (
        <p role="alert" className="text-sm text-mute leading-relaxed mt-3">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto mt-5 flex flex-col gap-5 -mx-1 px-1">
        {styles.map((style) => (
          <StyleCard key={style.id} style={style} />
        ))}
      </div>

      <button className="btn w-full mt-4" onClick={onDone} disabled={pending}>
        {pending ? "Finishing…" : "Open my app"}
      </button>
    </div>
  );
}

function StyleCard({ style }: { style: StyleSuggestion }) {
  const [url, setUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);

  async function render() {
    setRendering(true);
    setFailed(false);
    haptics.tap();
    try {
      const response = await fetch("/api/styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: style.id }),
      });
      const json = (await response.json()) as { url?: string };
      if (json.url) setUrl(json.url);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setRendering(false);
    }
  }

  return (
    <article className="border-t border-line pt-4">
      <h2 className="text-[21px]">{style.name}</h2>
      {style.one_liner && <p className="text-mute text-sm leading-relaxed mt-1">{style.one_liner}</p>}

      {style.palette.length > 0 && (
        <ul className="flex gap-1.5 mt-3">
          {style.palette.map((colour) => (
            <li
              key={colour.hex}
              className="w-8 h-8"
              style={{ background: colour.hex }}
              role="img"
              aria-label={colour.name}
              title={colour.name}
            />
          ))}
        </ul>
      )}

      {style.why_it_works && (
        <p className="text-sm leading-relaxed mt-3">{style.why_it_works}</p>
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

      {url ? (
        <figure className="mt-3">
          <div className="aspect-[3/4] bg-wash overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${style.name} rendered on your own photo`}
              className="w-full h-full object-cover animate-rise"
            />
          </div>
          <figcaption className="text-[11px] text-mute mt-2 leading-snug">
            Generated from your photo — an impression of the direction, not real garments.
          </figcaption>
        </figure>
      ) : rendering ? (
        <div className="aspect-[3/4] skel mt-3 flex items-end p-4">
          <span className="k">Dressing you…</span>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm mt-3" onClick={render}>
          <span className="mi text-[18px]" aria-hidden>
            styler
          </span>
          See it on me
        </button>
      )}

      {failed && (
        <p className="text-[13px] text-mute mt-2">Couldn&rsquo;t render that one. Try again.</p>
      )}
    </article>
  );
}
