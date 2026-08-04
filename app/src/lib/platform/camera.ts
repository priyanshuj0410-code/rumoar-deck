export type PickedImage = { file: File; dataUrl: string };

const MAX_EDGE = 1400;
const QUALITY = 0.82;

/**
 * Downscales before upload. Phone cameras produce 4–12MB files; a wardrobe tile never
 * needs more than ~1400px, and Indian mobile data is the binding constraint.
 */
async function compress(file: File): Promise<PickedImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

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

function openPicker(capture: boolean): Promise<PickedImage[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = !capture;
    // `capture` opens the rear camera directly on Android and iOS.
    if (capture) input.setAttribute("capture", "environment");
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

export const camera = {
  /** Pick one or more images from the library. */
  pick: () => openPicker(false),
  /** Open the camera directly. Falls back to the library where unsupported. */
  capture: async (): Promise<PickedImage | null> => {
    const [first] = await openPicker(true);
    return first ?? null;
  },
};
