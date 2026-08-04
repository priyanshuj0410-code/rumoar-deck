/**
 * Generates the PWA icon set with no image dependencies.
 *
 * The mark is a geometric "R" — a stem, a bowl and a leg — rendered analytically with 4x
 * supersampling, in ink on paper (maskable inverts to paper on ink so the Android mask
 * has bleed). Run `npm run icons` after changing anything here.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const INK = [0x17, 0x17, 0x1b];
const PAPER = [0xff, 0xff, 0xff];

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function onSegment(x, y, ax, ay, bx, by, half) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp01(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return Math.hypot(x - px, y - py) <= half;
}

/** Unit-square glyph: is (x, y) inside the R? */
function inR(x, y) {
  const x0 = 0.3,
    x1 = 0.7,
    y0 = 0.26,
    y1 = 0.74;
  const t = 0.088; // stroke thickness
  const bowlR = 0.115; // bowl outer radius
  const cx = x1 - bowlR;
  const cy = y0 + bowlR;

  // Stem
  if (inRect(x, y, x0, y0, x0 + t, y1)) return true;

  // Bowl: right half of an annulus, closed by the two crossbars
  const d = Math.hypot(x - cx, y - cy);
  if (x >= cx && d <= bowlR && d >= bowlR - t) return true;

  // Top and middle crossbars
  if (inRect(x, y, x0, y0, cx, y0 + t)) return true;
  if (inRect(x, y, x0, cy + bowlR - t, cx, cy + bowlR)) return true;

  // Leg
  if (onSegment(x, y, x0 + t * 0.6, cy + bowlR - t / 2, x1 - 0.01, y1, t / 2)) return true;

  return false;
}

function render(size, { invert = false, pad = 0 } = {}) {
  const fg = invert ? PAPER : INK;
  const bg = invert ? INK : PAPER;
  const S = 4; // supersampling factor
  const px = Buffer.alloc(size * size * 3);

  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let hits = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          // `pad` shrinks the glyph toward the centre so Android's maskable safe zone
          // (the inner 80%) never clips it.
          const u = (pxi + (sx + 0.5) / S) / size;
          const v = (py + (sy + 0.5) / S) / size;
          const gu = 0.5 + (u - 0.5) / (1 - pad);
          const gv = 0.5 + (v - 0.5) / (1 - pad);
          if (gu >= 0 && gu <= 1 && gv >= 0 && gv <= 1 && inR(gu, gv)) hits++;
        }
      }
      const a = hits / (S * S);
      const o = (py * size + pxi) * 3;
      for (let c = 0; c < 3; c++) {
        px[o + c] = Math.round(bg[c] * (1 - a) + fg[c] * a);
      }
    }
  }
  return px;
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });

const targets = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  // Apple does not apply a mask, so the icon must carry its own margin.
  ["apple-touch-icon.png", 180, { pad: 0.18 }],
  // Android masks to a circle/squircle: invert and shrink so nothing important is cropped.
  ["maskable-512.png", 512, { invert: true, pad: 0.32 }],
  ["favicon-32.png", 32, {}],
];

for (const [name, size, opts] of targets) {
  writeFileSync(join(OUT, name), png(size, render(size, opts)));
  console.log(`icons/${name}  ${size}×${size}`);
}
