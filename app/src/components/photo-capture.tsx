"use client";

import { useEffect, useRef, useState } from "react";
import { camera, haptics, type Facing, type PickedImage } from "@/lib/platform";

type Props = {
  title: string;
  hint: string;
  /** Rendered above the heading — the shot tiles, which belong with the copy on desktop. */
  lead?: React.ReactNode;
  existing?: PickedImage | null;
  onCaptured: (image: PickedImage) => void;
  onNext: () => void;
  nextLabel: string;
  busy?: boolean;
};

const DENIED_COPY =
  "Camera access is blocked for this site. Allow it in your browser settings, or upload instead.";
const UNSUPPORTED_COPY = "This browser won't open the camera here. Upload a photo instead.";

/**
 * One shot, and every action for it.
 *
 * The whole screen's action hierarchy lives here rather than being split with the parent,
 * because the primary action *changes with state* — "Take photo" on an empty step,
 * "Next" once there is something to move on from. Splitting it produced four stacked
 * full-width buttons all competing to be primary.
 */
export function PhotoCapture({
  title,
  hint,
  lead,
  existing,
  onCaptured,
  onNext,
  nextLabel,
  busy = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [live, setLive] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [notice, setNotice] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const preview = existing?.dataUrl ?? null;

  // Whatever happens, the camera light must go out when this step unmounts.
  useEffect(() => () => camera.closeStream(streamRef.current), []);

  async function start(nextFacing: Facing) {
    setNotice(null);
    setOpening(true);
    camera.closeStream(streamRef.current);

    try {
      const stream = await camera.openStream(nextFacing);
      streamRef.current = stream;
      setFacing(nextFacing);
      setLive(true);
      // The element only exists once `live` is true, so attach on the next frame.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      });
    } catch (error) {
      setNotice((error as Error).message === "denied" ? DENIED_COPY : UNSUPPORTED_COPY);
      setLive(false);
    } finally {
      setOpening(false);
    }
  }

  function stop() {
    camera.closeStream(streamRef.current);
    streamRef.current = null;
    setLive(false);
  }

  async function shoot() {
    if (!videoRef.current) return;
    haptics.select();
    const image = await camera.captureFrame(videoRef.current);
    if (!image) {
      setNotice("That frame didn't capture. Try again.");
      return;
    }
    stop();
    onCaptured(image);
  }

  async function upload() {
    setNotice(null);
    const image = await camera.pickOne();
    if (!image) return;
    stop();
    onCaptured(image);
  }

  return (
    <div
      className="flex flex-col lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]
                 lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:items-start"
    >
      {/* DOM order is the mobile order — copy, subject, actions. Desktop re-places them:
          copy and actions stack in the left column, the subject spans both rows on the
          right. */}
      <div className="lg:col-start-1 lg:row-start-1 lg:self-start">
        {lead}
        <h1 className="text-[26px] lg:text-[34px]">{title}</h1>
        <p className="text-mute text-[13px] lg:text-[15px] leading-relaxed mt-1 lg:mt-3 lg:max-w-[40ch]">
          {hint}
        </p>
      </div>

      {/* Capped, and centred. A full-bleed hero pushed every control below the fold and
          made the step look like it had nothing to do. */}
      <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 relative w-full h-[clamp(300px,46vh,440px)] lg:h-[min(62vh,560px)] bg-wash overflow-hidden mt-4 lg:mt-0">
        {live ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera preview"
              // Mirroring the preview only. The captured frame is never mirrored.
              className={`w-full h-full object-contain ${facing === "user" ? "-scale-x-100" : ""}`}
            >
              <track kind="captions" />
            </video>
            <div
              aria-hidden
              className="absolute inset-x-[16%] inset-y-[5%] border border-paper/70 pointer-events-none"
            />
            <span className="absolute bottom-2 inset-x-0 text-center k text-paper drop-shadow">
              Head to feet in frame
            </span>
          </>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={`Your ${title.toLowerCase()} photo`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
            <span className="mi text-[28px] text-mute" aria-hidden>
              person
            </span>
            <span className="k text-mute">Head to feet in frame</span>
          </div>
        )}
      </div>

      {notice && (
        <p
          role="alert"
          className="text-[13px] text-mute leading-relaxed mt-3 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:mb-3"
        >
          {notice}
        </p>
      )}

      <div className="mt-4 lg:mt-8 lg:col-start-1 lg:row-start-2 lg:self-start">
        {live ? (
          <div className="flex flex-col gap-2.5">
            <button className="btn w-full" onClick={shoot}>
              <span className="mi text-[20px]" aria-hidden>
                radio_button_checked
              </span>
              Capture
            </button>
            <div className="flex gap-2.5">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => start(facing === "user" ? "environment" : "user")}
              >
                <span className="mi text-[18px]" aria-hidden>
                  cameraswitch
                </span>
                Flip
              </button>
              <button className="btn btn-ghost flex-1" onClick={stop}>
                Cancel
              </button>
            </div>
          </div>
        ) : preview ? (
          <div className="flex flex-col gap-2.5">
            <button className="btn w-full" onClick={onNext} disabled={busy}>
              {busy ? "Uploading…" : nextLabel}
            </button>
            {/* Ghost buttons, not text links: they are real alternatives to Next, and
                only one ink block on the screen keeps the primary unambiguous. */}
            <div className="flex gap-2.5">
              {camera.supportsLive() && (
                <button
                  className="btn btn-ghost flex-1"
                  onClick={() => start(facing)}
                  disabled={opening}
                >
                  <span className="mi text-[18px]" aria-hidden>
                    photo_camera
                  </span>
                  Retake
                </button>
              )}
              <button className="btn btn-ghost flex-1" onClick={upload}>
                <span className="mi text-[18px]" aria-hidden>
                  upload
                </span>
                Choose another
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {camera.supportsLive() ? (
              <>
                <button className="btn w-full" onClick={() => start(facing)} disabled={opening}>
                  <span className="mi text-[20px]" aria-hidden>
                    photo_camera
                  </span>
                  {opening ? "Opening camera…" : "Take photo"}
                </button>
                <button className="btn btn-ghost w-full" onClick={upload}>
                  Upload a photo
                </button>
              </>
            ) : (
              <button className="btn w-full" onClick={upload}>
                <span className="mi text-[20px]" aria-hidden>
                  upload
                </span>
                Upload a photo
              </button>
            )}
          </div>
        )}

        <p className="text-[11px] text-mute leading-snug mt-5">
          Only you ever see these. They&rsquo;re read for colouring and fit, then kept
          private — never shown to anyone else, never used to train anything.
        </p>
      </div>
    </div>
  );
}
