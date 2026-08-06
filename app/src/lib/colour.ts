/**
 * Which ink a swatch can carry.
 *
 * A palette block shows its own name and hex on top of itself, so the text colour has to
 * follow the swatch rather than be fixed — white on deep olive, ink on cream. Uses WCAG
 * relative luminance rather than a naive average, because green contributes far more to
 * perceived brightness than blue does.
 */
const INK = "#17171B";
const PAPER = "#FFFFFF";

function luminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

export function readableOn(hex: string): string {
  const l = luminance(hex);
  if (l === null) return INK;

  // Measure both rather than trusting a lightness threshold. A mid ochre like #C9862B
  // sits below any sensible cut-off yet carries nearly double the contrast with ink
  // (5.8:1) than with white (3.1:1) — a threshold gets that exactly backwards.
  const inkL = luminance(INK) ?? 0;
  return contrast(l, inkL) >= contrast(l, 1) ? INK : PAPER;
}

/** A hairline that reads on a pale swatch and vanishes on a dark one. */
export const SWATCH_RING = "inset 0 0 0 1px rgba(23,23,27,0.16)";
