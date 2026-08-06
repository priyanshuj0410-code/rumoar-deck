import { byLightness } from "@/lib/colour";
import type { ColourAnalysis, Profile } from "@/lib/types";

/**
 * One side of A4. It exists to be consulted standing up in a shop, so everything that does
 * not change what he buys has been cut: the notes paragraph, the feature read, his own
 * corrections, and the confidence number when it is good news. What survives is the
 * palette, the four axis words that let him extend it to a shop that stocks none of these
 * colours, and the rules for fit.
 */

/** Colour that survives paper. See print.css — a CSS background does not. */
function Swatch({
  hex,
  w,
  h,
  label,
}: {
  hex: string;
  w: number;
  h: number;
  label: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      style={{ width: `${w}mm`, height: `${h}mm`, display: "block" }}
    >
      <rect width={w} height={h} fill={hex} />
      {/* Drawn inside the SVG so a cream or near-white swatch still reads as an object
          rather than a hole in the page, and so the edge cannot be dropped separately
          from the fill. */}
      <rect
        x="0.25"
        y="0.25"
        width={w - 0.5}
        height={h - 0.5}
        fill="none"
        stroke="#E9E8E3"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/** fit_notes and the styling prose arrive as sentences; a card wants lines. */
function lines(text: string | null | undefined, cap: number): string[] {
  if (!text) return [];
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, cap);
}

export function Sheet({
  profile,
  analysis,
}: {
  profile: Profile;
  analysis: ColourAnalysis;
}) {
  const issued = new Date(profile.analysed_at ?? Date.now()).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );

  // The palette is the document, so it takes the column and the bands grow or shrink to
  // fill it — eight thin stripes and four fat ones are both wrong for the same reason.
  const wear = [...analysis.best_colours]
    .sort((a, b) => byLightness(a.hex, b.hex))
    .slice(0, 8);
  // 200mm of column is what is left once the masthead and the colophon have taken theirs,
  // and each band costs its own height plus ~10mm of caption.
  const bandHeight = Math.max(
    12,
    Math.min(24, Math.round(200 / wear.length) - 10),
  );
  const never = analysis.avoid_colours.slice(0, 4);

  const axes = [
    analysis.undertone,
    analysis.depth,
    analysis.contrast,
    analysis.chroma,
  ]
    .filter(Boolean)
    .join(" · ");

  const fit = lines(analysis.build?.fit_notes, 3);
  const build = analysis.physique?.body_shape_styling;
  const face = analysis.physique?.face_shape_styling;
  const hair = analysis.physique?.hair?.styling;
  const beard = analysis.physique?.beard?.present
    ? analysis.physique.beard.styling
    : null;

  return (
    <div className="sheet">
      <div className="band">
        <span className="mark">RUMOAR</span>
        <span className="who">
          {profile.display_name ? `${profile.display_name} · ` : ""}
          {issued}
        </span>
      </div>
      <hr className="rule" style={{ margin: "3mm 0 6mm" }} />

      <p className="eyebrow">Your season</p>
      <h1 className="season">{analysis.season}</h1>
      <p className="axes">{axes}</p>
      {analysis.season_confidence < 0.75 && (
        // A good number is decoration. Only bad news earns ink.
        <p className="eyebrow" style={{ margin: "2.5mm 0 0" }}>
          Provisional read · {Math.round(analysis.season_confidence * 100)}%
        </p>
      )}

      <div className="cols">
        <div>
          <p className="eyebrow">Wear these</p>
          {wear.map((colour) => (
            <div key={colour.hex}>
              <Swatch
                hex={colour.hex}
                w={88}
                h={bandHeight}
                label={colour.name}
              />
              <div className="chip-row" style={{ paddingBottom: "5mm" }}>
                <span className="chip-name">{colour.name}</span>
                <span className="chip-hex">{colour.hex.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        <div>
          {never.length > 0 && (
            <section>
              <p className="eyebrow">Never these</p>
              <ul className="avoid">
                {never.map((colour) => (
                  <li key={colour.hex}>
                    <Swatch hex={colour.hex} w={8} h={8} label={colour.name} />
                    <span>{colour.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {analysis.metals && (
            <section>
              <p className="eyebrow">Metal</p>
              <p className="rule-line">{analysis.metals}</p>
            </section>
          )}

          {fit.length > 0 && (
            <section>
              <p className="eyebrow">How it should fit</p>
              {fit.map((line) => (
                <p key={line} className="rule-line">
                  {line}
                </p>
              ))}
            </section>
          )}

          {(build || face) && (
            <section>
              <p className="eyebrow">Build &amp; face</p>
              {build && (
                <>
                  <p className="sub">{analysis.physique?.body_shape}</p>
                  <p className="rule-line">{build}</p>
                </>
              )}
              {face && (
                <>
                  <p className="sub" style={{ marginTop: "3mm" }}>
                    {analysis.physique?.face_shape}
                  </p>
                  <p className="rule-line">{face}</p>
                </>
              )}
            </section>
          )}

          {(hair || beard) && (
            <section>
              <p className="eyebrow">Hair &amp; beard</p>
              {hair && <p className="rule-line">{hair}</p>}
              {beard && <p className="rule-line">{beard}</p>}
            </section>
          )}
        </div>
      </div>

      <p className="colophon">
        Printers lie — the hex is the truth. {analysis.caveat} Read by RUMOAR on{" "}
        {issued}. rumoar-app-alpha.vercel.app
      </p>
    </div>
  );
}
