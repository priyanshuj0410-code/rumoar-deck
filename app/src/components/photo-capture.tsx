"use client";

import { useEffect, useRef, useState } from "react";
import { camera, haptics, type Facing, type PickedImage } from "@/lib/platform";

type Props = {
  title: string;
  hint: string;
  existing?: PickedImage | null;
  onCaptured: (image: PickedImage) => void;
};

const DENIED_COPY =
  "Camera access is blocked for this site. Allow it in your browser settings, or upload a photo instead.";
const UNSUPPORTED_COPY =
  "This browser won't open the camera here. Upload a photo instead — it works exactly as well.";

/**
 * One guided shot. The camera is only opened when the user asks for it, so the permission
 * prompt arrives attached to an obvious intent rather than on page load. Upload is always
 * available beside it and is never treated as the lesser path — on a laptop it usually is
 * the better one.
 */
export function PhotoCapture({ title, hint, existing, onCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [live, setLive] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [preview, setPreview] = useState<string | null>(existing?.dataUrl ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Whatever happens, the camera light must go out when this step unmounts.
  useEffect(() => {
    return () => camera.closeStream(streamRef.current);
  }, []);

  useEffect(() => {
    setPreview(existing?.dataUrl ?? null);
  }, [existing]);

  async function start(nextFacing: Facing) {
    setNotice(null);
    setBusy(true);
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
      const reason = (error as Error).message;
      setNotice(reason === "denied" ? DENIED_COPY : UNSUPPORTED_COPY);
      setLive(false);
    } finally {
      setBusy(false);
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
    setPreview(image.dataUrl);
    onCaptured(image);
  }

  async function upload() {
    setNotice(null);
    const image = await camera.pickOne();
    if (!image) return;
    stop();
    setPreview(image.dataUrl);
    onCaptured(image);
  }

  return (
    <div className="flex-1 flex flex-col pt-6">
      <h1 className="text-[28px]">{title}</h1>
      <p className="text-mute text-sm leading-relaxed mt-2">{hint}</p>

      <div className="relative flex-1 min-h-[220px] bg-wash overflow-hidden mt-5 flex items-center justify-center">
        {live ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              // Mirroring the preview only. The captured frame is never mirrored.
              className={`w-full h-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
            {/* A full-body framing guide — the single most common mistake is cropping the feet. */}
            <div
              aria-hidden
              className="absolute inset-x-[18%] inset-y-[6%] border border-paper/70 pointer-events-none"
            />
            <span className="absolute bottom-3 left-0 right-0 text-center k text-paper drop-shadow">
              Fit head to feet inside the frame
            </span>
          </>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`Your ${title.toLowerCase()} photo`} className="w-full h-full object-cover" />
        ) : (
          <span className="mi text-[30px] text-mute" aria-hidden>
            photo_camera
          </span>
        )}
      </div>

      {notice && (
        <p role="alert" className="text-[13px] text-mute leading-relaxed mt-3">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-2.5 mt-4">
        {live ? (
          <>
            <button className="btn w-full" onClick={shoot}>
              <span className="mi text-[20px]" aria-hidden>
                radio_button_checked
              </span>
              Capture
            </button>
            <div className="flex gap-2.5">
              <button
                className="btn btn-ghost btn-sm flex-1"
                onClick={() => start(facing === "user" ? "environment" : "user")}
              >
                <span className="mi text-[18px]" aria-hidden>
                  cameraswitch
                </span>
                Flip
              </button>
              <button className="btn btn-ghost btn-sm flex-1" onClick={stop}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {camera.supportsLive() && (
              <button className="btn w-full" onClick={() => start(facing)} disabled={busy}>
                <span className="mi text-[20px]" aria-hidden>
                  photo_camera
                </span>
                {busy ? "Opening camera…" : preview ? "Retake" : "Take photo"}
              </button>
            )}
            <button
              className={`btn w-full ${camera.supportsLive() ? "btn-ghost" : ""}`}
              onClick={upload}
            >
              <span className="mi text-[20px]" aria-hidden>
                upload
              </span>
              {preview ? "Choose a different photo" : "Upload a photo"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
