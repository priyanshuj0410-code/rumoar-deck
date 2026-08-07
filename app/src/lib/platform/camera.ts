export type PickedImage = { file: File; dataUrl: string };
export type Facing = "user" | "environment";

const MAX_EDGE = 1400;
const QUALITY = 0.82;

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscales before upload. Phone cameras produce 4–12MB files; the analysis never needs
 * more than ~1400px, and Indian mobile data is the binding constraint.
 */
async function compress(file: File): Promise<PickedImage> {
  const dataUrl = await readDataUrl(file);
  if (typeof document === "undefined") return { file, dataUrl };

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 900_000) return { file, dataUrl };

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, dataUrl };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) return { file, dataUrl };

  return {
    file: new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    }),
    dataUrl: canvas.toDataURL("image/jpeg", QUALITY),
  };
}

function openPicker(multiple: boolean): Promise<PickedImage[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      resolve(await Promise.all(files.map(compress)));
    };
    // Safari drops the change event if the input is never in the document.
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 60_000);
  });
}

export type CameraError = "unsupported" | "denied" | "unavailable";

export const camera = {
  /**
   * A smaller derivative for sending to the image model. Identity survives 768px fine,
   * and the base64 payload is roughly a quarter the size — which is a large share of the
   * round-trip on a generation that is already near the function time limit.
   */
  async resize(file: File, maxEdge = 768): Promise<File> {
    const dataUrl = await readDataUrl(file);
    if (typeof document === "undefined") return file;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });

    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    if (scale === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    return blob ? new File([blob], file.name, { type: "image/jpeg" }) : file;
  },

  /** Pick images from the library. */
  pick: () => openPicker(true),
  pickOne: async (): Promise<PickedImage | null> =>
    (await openPicker(false))[0] ?? null,

  /**
   * Live capture is only offered where it can actually work: it needs getUserMedia and a
   * secure context. Safari on plain http (a phone hitting a laptop's dev server by IP)
   * has neither, and must fall back to the file picker.
   */
  supportsLive(): boolean {
    if (typeof navigator === "undefined" || typeof window === "undefined")
      return false;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    return window.isSecureContext;
  },

  /**
   * Prompts for camera permission the first time it is called.
   *
   * A ladder, not one shot. 1080x1920 maps onto the rotated 1920x1080 capture preset with
   * no rescale where 1440x1920 forces a scale pass, and iOS 17 has been seen to throw
   * OverconstrainedError on asks as plain as `{video: true}` — so every rung is tried
   * before the failure is reported as one the user can do nothing about.
   */
  async openStream(facing: Facing): Promise<MediaStream> {
    if (!this.supportsLive())
      throw new Error("unsupported" satisfies CameraError);

    const ladder: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false,
      },
      { video: { facingMode: facing }, audio: false },
      { video: true, audio: false },
    ];

    let last: unknown;
    for (const constraints of ladder) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        last = error;
        // A refusal is a refusal at every rung; only over-constraint is worth retrying.
        const name = (error as { name?: string }).name;
        if (name === "NotAllowedError" || name === "SecurityError") break;
      }
    }

    const name = (last as { name?: string })?.name;
    throw new Error(
      name === "NotAllowedError" || name === "SecurityError"
        ? ("denied" satisfies CameraError)
        : ("unavailable" satisfies CameraError),
    );
  },

  /** Whether a frame can actually be grabbed. videoWidth is 0 until metadata lands. */
  frameReady(video: HTMLVideoElement | null): boolean {
    return (
      !!video &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    );
  },

  /**
   * Why the preview is blank, in words. Without this a stalled camera is a grey rectangle
   * and a shrug — and on a device we cannot attach a debugger to, that is the whole bug
   * report.
   */
  describeStall(
    video: HTMLVideoElement | null,
    track: MediaStreamTrack | null,
  ): string {
    if (!video)
      return "The camera preview didn't load. Upload a photo instead.";
    if (!video.srcObject)
      return "The camera didn't attach to the preview. Try again, or upload a photo.";
    if (track && track.readyState === "ended")
      return "The camera stopped. Another app may have taken it — close that and try again.";
    if (track?.muted)
      return "The camera is paused. Come back to this tab, or upload a photo.";
    if (video.readyState < 2)
      return "The camera is taking a while to start. Give it a moment, or upload a photo.";
    return "That frame didn't capture. Try again.";
  },

  closeStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  },

  /** Grabs the current video frame. Never mirrored, even when the preview is. */
  async captureFrame(video: HTMLVideoElement): Promise<PickedImage | null> {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob) return null;

    // Derived from the blob rather than a second toDataURL: encoding the same canvas twice
    // doubles peak memory on the one path an iPhone is most likely to be squeezed on.
    return {
      file: new File([blob], `capture-${canvas.width}x${canvas.height}.jpg`, {
        type: "image/jpeg",
      }),
      dataUrl: await readDataUrl(blob),
    };
  },
};
