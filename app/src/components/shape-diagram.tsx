"use client";

import { useState } from "react";

/**
 * Body and face shapes, drawn rather than named.
 *
 * "Trapezoid build" is jargon until you can see it. Each shape is a schematic, not a
 * portrait — the point is the proportion, so the drawings are deliberately abstract and
 * carry no face, no gender cues and no body-ideal.
 */

type Shape = { key: string; label: string; path: string };

const VIEW = 100;

/** Torso silhouettes, from shoulder / waist / hip half-widths. */
function torso(shoulder: number, waist: number, hip: number): string {
  const y = { top: 18, waist: 55, bottom: 92 };
  const c = VIEW / 2;
  return [
    `M ${c - shoulder} ${y.top}`,
    `C ${c - shoulder} ${y.top}, ${c - waist} ${y.waist - 12}, ${c - waist} ${y.waist}`,
    `C ${c - waist} ${y.waist + 12}, ${c - hip} ${y.bottom - 14}, ${c - hip} ${y.bottom}`,
    `L ${c + hip} ${y.bottom}`,
    `C ${c + hip} ${y.bottom - 14}, ${c + waist} ${y.waist + 12}, ${c + waist} ${y.waist}`,
    `C ${c + waist} ${y.waist - 12}, ${c + shoulder} ${y.top}, ${c + shoulder} ${y.top}`,
    "Z",
  ].join(" ");
}

export const BODY_SHAPES: Shape[] = [
  { key: "rectangle", label: "Rectangle", path: torso(31, 30, 31) },
  { key: "triangle", label: "Triangle", path: torso(24, 31, 40) },
  { key: "inverted triangle", label: "Inverted triangle", path: torso(40, 29, 24) },
  { key: "oval", label: "Oval", path: torso(28, 40, 30) },
  { key: "trapezoid", label: "Trapezoid", path: torso(38, 25, 32) },
];

export const FACE_SHAPES: Shape[] = [
  { key: "oval", label: "Oval", path: "M50 10 C68 10 74 32 74 50 C74 72 63 90 50 90 C37 90 26 72 26 50 C26 32 32 10 50 10 Z" },
  { key: "round", label: "Round", path: "M50 12 C72 12 80 30 80 50 C80 72 68 88 50 88 C32 88 20 72 20 50 C20 30 28 12 50 12 Z" },
  { key: "square", label: "Square", path: "M28 14 L72 14 C77 14 78 18 78 24 L78 74 C78 82 74 86 68 86 L32 86 C26 86 22 82 22 74 L22 24 C22 18 23 14 28 14 Z" },
  { key: "heart", label: "Heart", path: "M22 26 C22 16 34 12 50 12 C66 12 78 16 78 26 C78 48 68 68 50 90 C32 68 22 48 22 26 Z" },
  { key: "oblong", label: "Oblong", path: "M50 8 C67 8 72 28 72 50 C72 74 63 92 50 92 C37 92 28 74 28 50 C28 28 33 8 50 8 Z" },
  { key: "diamond", label: "Diamond", path: "M50 8 C60 8 74 34 74 50 C74 66 60 92 50 92 C40 92 26 66 26 50 C26 34 40 8 50 8 Z" },
];

/**
 * The model writes prose ("oval with a slightly square jaw"), so match loosely — but on
 * the shape named FIRST, not the longest name present. Preferring the longest key read
 * that example as Square, when the subject is plainly oval.
 */
export function matchShape(value: string | undefined, shapes: Shape[]): Shape | null {
  if (!value) return null;
  const text = value.toLowerCase();

  const hits = shapes
    .map((shape) => ({ shape, at: text.indexOf(shape.key) }))
    .filter((hit) => hit.at !== -1)
    // Earliest wins; on a tie the longer key wins, so "inverted triangle" is never
    // swallowed by the "triangle" inside it.
    .sort((a, b) => a.at - b.at || b.shape.key.length - a.shape.key.length);

  return hits[0]?.shape ?? null;
}

/**
 * Outline first, at both states. A solid ink fill collapses these into indistinct blobs
 * at 60px — the silhouette is the whole point, so the stroke carries it and the active
 * state is a tint plus full opacity rather than a filled mass.
 */
function Glyph({ path, active }: { path: string; active: boolean }) {
  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full h-full" aria-hidden focusable="false">
      <path
        d={path}
        fill={active ? "var(--color-ink)" : "none"}
        fillOpacity={active ? 0.1 : 0}
        stroke="var(--color-ink)"
        strokeWidth={active ? 4 : 2.5}
        opacity={active ? 1 : 0.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The user's shape, drawn, with the rest available on request — seeing the neighbours is
 * what makes your own read as a judgement rather than a label.
 */
export function ShapeReading({
  shapes,
  value,
  note,
  otherLabel,
}: {
  shapes: Shape[];
  value: string;
  note: string;
  otherLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const match = matchShape(value, shapes);

  return (
    <div>
      <div className="flex items-start gap-4">
        {match && (
          <span className="w-[72px] h-[72px] flex-none -mt-1">
            <Glyph path={match.path} active />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[15px]">{match?.label ?? value}</p>
          {note && <p className="text-sm leading-relaxed text-mute mt-1">{note}</p>}
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[13px] text-mute hover:text-ink transition-colors mt-3"
      >
        <span className="mi text-[18px]" aria-hidden>
          {open ? "expand_less" : "expand_more"}
        </span>
        {otherLabel}
      </button>

      {open && (
        <ul className="grid grid-cols-3 gap-3 mt-3 animate-rise" role="list">
          {shapes.map((shape) => {
            const isYours = shape.key === match?.key;
            return (
              <li key={shape.key} className="text-center">
                <span className="block w-full aspect-square p-2 bg-wash">
                  <Glyph path={shape.path} active={isYours} />
                </span>
                <span
                  className={`text-[11px] leading-tight block mt-1 ${
                    isYours ? "text-ink" : "text-mute"
                  }`}
                >
                  {shape.label}
                  {isYours && <span className="sr-only"> — this is yours</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
