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
    file: new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }),
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
  /** Pick images from the library. */
  pick: () => openPicker(true),
  pickOne: async (): Promise<PickedImage | null> => (await openPicker(false))[0] ?? null,

  /**
   * Live capture is only offered where it can actually work: it needs getUserMedia and a
   * secure context. Safari on plain http (a phone hitting a laptop's dev server by IP)
   * has neither, and must fall back to the file picker.
   */
  supportsLive(): boolean {
    if (typeof navigator === "undefined" || typeof window === "undefined") return false;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    return window.isSecureContext;
  },

  /** Prompts for camera permission the first time it is called. */
  async openStream(facing: Facing): Promise<MediaStream> {
    if (!this.supportsLive()) throw new Error("unsupported" satisfies CameraError);
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
        audio: false,
      });
    } catch (error) {
      const name = (error as { name?: string }).name;
      throw new Error(
        name === "NotAllowedError" || name === "SecurityError"
          ? ("denied" satisfies CameraError)
          : ("unavailable" satisfies CameraError),
      );
    }
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

    return {
      file: new File([blob], `capture-${canvas.width}x${canvas.height}.jpg`, {
        type: "image/jpeg",
      }),
      dataUrl: canvas.toDataURL("image/jpeg", QUALITY),
    };
  },
};
