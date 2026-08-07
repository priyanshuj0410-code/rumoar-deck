"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { camera, haptics, type Facing, type PickedImage } from "@/lib/platform";

type Props = {
  title: string;
  hint: string;
  /** Rendered above the heading — the shot tiles, which belong with the copy on desktop. */
  lead?: React.ReactNode;
  /** Replaces the state-derived button stack. The privacy line below it stays. */
  actions?: React.ReactNode;
  /** A caption printed on the photograph itself, in the frame's existing caption slot. */
  band?: string;
  /** A failure that belongs to the step rather than the camera. */
  problem?: string | null;
  /**
   * Whether live capture is possible. Decided by the parent, above this component's `key`:
   * reading it during render is a hydration mismatch (false on the server, true on a
   * phone), and reading it in a mount effect here would flash the wrong button stack every
   * time a tile is tapped, because this component remounts on each one.
   */
  canLive?: boolean;
  existing?: PickedImage | null;
  onCaptured: (image: PickedImage) => void;
  onNext: () => void;
  nextLabel: string;
  busy?: boolean;
};

const DENIED_COPY =
  "Camera access is blocked for this site. Allow it in your browser settings, or upload instead.";
const UNSUPPORTED_COPY =
  "This browser won't open the camera here. Upload a photo instead.";

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
  actions,
  band,
  problem,
  canLive = false,
  existing,
  onCaptured,
  onNext,
  nextLabel,
  busy = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [notice, setNotice] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  // Bumped on every successful open, so the track listeners below rebind when the camera
  // is flipped — `live` stays true across a flip, so it cannot carry that signal itself.
  const [generation, setGeneration] = useState(0);

  const openId = useRef(0);
  const alive = useRef(true);

  const preview = existing?.dataUrl ?? null;

  // Whatever happens, the camera light must go out when this step unmounts.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      camera.closeStream(streamRef.current);
    };
  }, []);

  /**
   * Attaches the stream during React's commit rather than on a later animation frame.
   *
   * The old code waited a frame and then checked `if (videoRef.current)`. A rendering
   * opportunity already pending when the tap's microtasks drain runs that callback
   * *before* React commits, so the ref was null, the guard silently did nothing, and the
   * preview stayed blank for ever with no error anywhere. A callback ref cannot lose that
   * race: React calls it with the element, at commit.
   */
  const attach = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    const stream = streamRef.current;
    if (!element || !stream) return;

    if (element.srcObject !== stream) element.srcObject = stream;
    void element.play().catch((error: DOMException) => {
      // Never swallowed. Every blank preview used to end its life in an empty catch.
      setNotice(
        camera.describeStall(element, stream.getVideoTracks()[0] ?? null),
      );
      if (process.env.NODE_ENV !== "production")
        console.warn("preview play()", error.name);
    });
  }, []);

  /** The preview only counts as running once a frame can actually be grabbed. */
  useEffect(() => {
    if (!live) return;
    const element = videoRef.current;
    const track = streamRef.current?.getVideoTracks()[0] ?? null;
    if (!element) return;

    const check = () => setReady(camera.frameReady(element));
    check();

    element.addEventListener("loadedmetadata", check);
    element.addEventListener("playing", check);

    // iOS mutes the track on an ordinary interruption — a call, a tab switch — and unmutes
    // it on return, so a mute is a state to recover from, not a failure to report for ever.
    const onMute = () => {
      setReady(false);
      setNotice(camera.describeStall(element, track));
    };
    const onUnmute = () => {
      setNotice(null);
      check();
    };
    const onEnded = () => {
      setReady(false);
      setNotice(camera.describeStall(element, track));
    };
    track?.addEventListener("mute", onMute);
    track?.addEventListener("unmute", onUnmute);
    track?.addEventListener("ended", onEnded);

    // If nothing is drawing after three seconds, say why rather than showing a grey box.
    const watchdog = setTimeout(() => {
      if (!camera.frameReady(element))
        setNotice(camera.describeStall(element, track));
    }, 3000);

    return () => {
      element.removeEventListener("loadedmetadata", check);
      element.removeEventListener("playing", check);
      track?.removeEventListener("mute", onMute);
      track?.removeEventListener("unmute", onUnmute);
      track?.removeEventListener("ended", onEnded);
      clearTimeout(watchdog);
    };
  }, [live, generation]);

  async function start(nextFacing: Facing) {
    const id = ++openId.current;
    setNotice(null);
    setReady(false);
    setOpening(true);
    camera.closeStream(streamRef.current);
    streamRef.current = null;

    try {
      const stream = await camera.openStream(nextFacing);

      // The step unmounts if a tile is tapped while the permission sheet is up, and a
      // second start() can overtake the first. Either way this stream has no owner, and an
      // unowned stream leaves the camera light on.
      if (!alive.current || id !== openId.current) {
        camera.closeStream(stream);
        return;
      }

      streamRef.current = stream;
      setFacing(nextFacing);
      setLive(true);
      setGeneration((n) => n + 1);
      // Already mounted on a flip, so the ref callback will not fire again.
      if (videoRef.current) attach(videoRef.current);
    } catch (error) {
      if (!alive.current || id !== openId.current) return;
      setNotice(
        (error as Error).message === "denied" ? DENIED_COPY : UNSUPPORTED_COPY,
      );
      setLive(false);
    } finally {
      if (alive.current && id === openId.current) setOpening(false);
    }
  }

  function stop() {
    camera.closeStream(streamRef.current);
    streamRef.current = null;
    setLive(false);
    setReady(false);
  }

  async function shoot() {
    const element = videoRef.current;
    const track = streamRef.current?.getVideoTracks()[0] ?? null;
    if (!camera.frameReady(element)) {
      setNotice(camera.describeStall(element, track));
      return;
    }
    haptics.select();
    const image = await camera.captureFrame(element as HTMLVideoElement);
    if (!image) {
      setNotice(camera.describeStall(element, track));
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
      className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]
                 lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:items-start"
    >
      {/* DOM order is the mobile order — copy, subject, actions. Desktop re-places them:
          the subject holds the left column across both rows and the flow runs down the
          right, so the eye lands on the photograph first and the controls sit beside it. */}
      <div className="lg:col-start-2 lg:row-start-1 lg:self-start">
        {lead}
        <h1 className="text-[26px] lg:text-[34px]">{title}</h1>
        <p className="text-mute text-[13px] lg:text-[15px] leading-relaxed mt-1 lg:mt-3 lg:max-w-[40ch]">
          {hint}
        </p>
      </div>

      {/* Capped, and centred. A full-bleed hero pushed every control below the fold and
          made the step look like it had nothing to do. */}
      <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2 mt-4 lg:mt-0">
        <div className="relative w-full h-[clamp(300px,46vh,440px)] lg:h-[min(64vh,600px)] bg-wash overflow-hidden">
          {live ? (
            <>
              <video
                ref={attach}
                playsInline
                muted
                aria-label="Camera preview"
                // Mirroring the preview only. The captured frame is never mirrored.
                className={`w-full h-full object-contain ${facing === "user" ? "-scale-x-100" : ""}`}
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
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={`Your ${title.toLowerCase()} photo`}
                className="w-full h-full object-contain"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <span className="mi text-[28px] text-mute" aria-hidden>
                person
              </span>
              <span className="k text-mute">Head to feet in frame</span>
            </div>
          )}
        </div>

        {/* A plate under the picture, not a label across it. The claim is about what is in
          the photograph, so it is captioned like one. */}
        {band && (
          <p className="border-t border-line px-3 py-2.5 k text-ink">{band}</p>
        )}
      </div>

      <div className="mt-4 lg:mt-8 lg:col-start-2 lg:row-start-2 lg:self-start">
        {/* Inside the stack, not beside it: as a sibling grid item this shared a cell with
            the buttons and rendered on top of them. */}
        {problem && (
          <p role="alert" className="text-[14px] leading-relaxed mb-3">
            {problem}
          </p>
        )}
        {notice && (
          <p
            role="alert"
            className="text-[13px] text-mute leading-relaxed mb-3"
          >
            {notice}
          </p>
        )}

        {actions ? (
          actions
        ) : live ? (
          <div className="flex flex-col gap-2.5">
            {/* videoWidth is 0 until metadata lands, and captureFrame returns null on a
                zero-sized frame — which is exactly the "that frame didn't capture" the
                user hit. The button waits for a frame that can actually be grabbed. */}
            <button className="btn w-full" onClick={shoot} disabled={!ready}>
              <span className="mi text-[20px]" aria-hidden>
                radio_button_checked
              </span>
              {ready ? "Capture" : "Starting camera…"}
            </button>
            <div className="flex gap-2.5">
              <button
                className="btn btn-ghost flex-1"
                onClick={() =>
                  start(facing === "user" ? "environment" : "user")
                }
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
              {canLive && (
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
            {canLive ? (
              <>
                <button
                  className="btn w-full"
                  onClick={() => start(facing)}
                  disabled={opening}
                >
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
          Only you ever see these. They&rsquo;re read for colouring and fit,
          then kept private — never shown to anyone else, never used to train
          anything.
        </p>
      </div>
    </div>
  );
}
