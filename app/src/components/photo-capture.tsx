"use client";

import { useEffect, useRef, useState } from "react";
import { camera, haptics, type Facing, type PickedImage } from "@/lib/platform";

type Props = {
  title: string;
  hint: string;
  guide: string;
  existing?: PickedImage | null;
  onCaptured: (image: PickedImage) => void;
  onNext: () => void;
  onBack?: () => void;
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
  guide,
  existing,
  onCaptured,
  onNext,
  onBack,
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
    <div className="flex-1 flex flex-col">
      <div className="mt-6">
        <h1 className="text-[26px]">{title}</h1>
        {!preview && !live && <p className="text-mute text-[13px] leading-relaxed mt-1">{hint}</p>}
      </div>

      {/* Capped, and centred. A full-bleed hero pushed every control below the fold and
          made the step look like it had nothing to do. */}
      <div className="relative w-full max-w-[280px] mx-auto aspect-[3/4] bg-wash overflow-hidden mt-5">
        {live ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              // Mirroring the preview only. The captured frame is never mirrored.
              className={`w-full h-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
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
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="mi text-[26px] text-mute" aria-hidden>
              person
            </span>
            <p className="text-mute text-[12px] leading-relaxed">{guide}</p>
          </div>
        )}
      </div>

      {notice && (
        <p role="alert" className="text-[13px] text-mute leading-relaxed mt-3 text-center">
          {notice}
        </p>
      )}

      <div className="mt-auto pt-6">
        {live ? (
          <div className="flex flex-col gap-2.5">
            <button className="btn w-full" onClick={shoot}>
              <span className="mi text-[20px]" aria-hidden>
                radio_button_checked
              </span>
              Capture
            </button>
            <div className="flex justify-center gap-6 text-[13px] text-mute">
              <button
                className="hover:text-ink transition-colors"
                onClick={() => start(facing === "user" ? "environment" : "user")}
              >
                Flip camera
              </button>
              <button className="hover:text-ink transition-colors" onClick={stop}>
                Cancel
              </button>
            </div>
          </div>
        ) : preview ? (
          <div className="flex flex-col gap-2.5">
            <button className="btn w-full" onClick={onNext} disabled={busy}>
              {busy ? "Uploading…" : nextLabel}
            </button>
            {/* Secondary actions are text, not buttons. Two black blocks on one screen
                means neither of them is the primary one. */}
            <div className="flex justify-center gap-6 text-[13px] text-mute">
              {camera.supportsLive() && (
                <button
                  className="hover:text-ink transition-colors"
                  onClick={() => start(facing)}
                  disabled={opening}
                >
                  Retake
                </button>
              )}
              <button className="hover:text-ink transition-colors" onClick={upload}>
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

        <div className="flex items-center justify-between mt-4">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[13px] text-mute hover:text-ink transition-colors"
            >
              <span className="mi text-[18px] -ml-0.5" aria-hidden>
                arrow_back
              </span>
              Back
            </button>
          ) : (
            <span />
          )}
          <span className="text-[11px] text-mute">Private to your account</span>
        </div>
      </div>
    </div>
  );
}
