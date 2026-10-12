#!/usr/bin/env python3
"""WCAG 2.1 contrast and type-scale check for the RUMOAR product app.

Reads the real tokens from app/src/app/globals.css, so a change there cannot drift from the
figures printed in knowledge/design.md. Every ratio the doc states is recomputed here and the
doc must contain the computed figure, so a stale figure fails.

Run: python3 knowledge/contrast.py     Exit status 1 on any failure.
Targets: text 4.5, control boundaries, focus rings and meaningful graphics 3.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "app", "src")
css = open(os.path.join(SRC, "app", "globals.css"), encoding="utf-8").read()
doc = open(os.path.join(HERE, "design.md"), encoding="utf-8").read()


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h):
    if isinstance(h, tuple):
        return h
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(c):
    r, g, b = rgb(c)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def over(top, alpha, bottom):
    t, b = rgb(top), rgb(bottom)
    return tuple(alpha * x + (1 - alpha) * y for x, y in zip(t, b))


tok = {k: v for k, v in re.findall(r"--color-([a-z]+):\s*(#[0-9a-fA-F]{6})", css)}
alpha = float(re.search(r"\.glass\s*\{[^}]*rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)", css).group(1))
skel_a, skel_b = re.search(r"\.skel\s*\{[^}]*(#[0-9a-fA-F]{6}) 25%,\s*(#[0-9a-fA-F]{6}) 37%", css).groups()
paper, wash, ink = tok["paper"], tok["wash"], tok["ink"]
glass_paper, glass_wash = over("#FFFFFF", alpha, paper), over("#FFFFFF", alpha, wash)

fails = 0
count = 0


def row(name, fg, bg, target, stated=True):
    """target None: informational, a documented limit with no pass mark."""
    global fails, count
    r = ratio(fg, bg)
    fig = f"{r:.2f}"
    ok = target is None or r >= target
    in_doc = (not stated) or f"{fig}:1" in doc
    count += 1
    fails += (not ok) + (not in_doc)
    tag = "INFO" if target is None else ("PASS" if ok else "FAIL")
    note = "" if in_doc else f"   FAIL: doc does not state {fig}:1"
    print(f"{tag}  {name:58s} = {fig}" + (f"  (>= {target})" if target else "") + note)


print(f"glass alpha {alpha} (from .glass), skeleton {skel_a} to {skel_b}")
print("--- Text on the two surfaces")
row("ink on paper", ink, paper, 4.5)
row("ink on wash", ink, wash, 4.5)
row("paper on ink (primary button label)", paper, ink, 4.5, stated=False)
row("mute on paper", tok["mute"], paper, 4.5)
row("mute on wash", tok["mute"], wash, 4.5)
row("volt on paper (links)", tok["volt"], paper, 4.5)
row("volt on wash", tok["volt"], wash, 4.5)
row("ok on paper (success text and icon)", tok["ok"], paper, 4.5)
row("ok on wash (icon or graphic only, 3:1)", tok["ok"], wash, 3.0)
print("--- Semantic colours (design.md, Interaction states)")
for name in ("err", "warn"):
    row(f"{name} on paper", tok[name], paper, 4.5)
    row(f"{name} on wash", tok[name], wash, 4.5)
    row(f"{name} on skeleton shimmer, lighter", tok[name], skel_a, 4.5, stated=False)
    row(f"{name} on skeleton shimmer, darker", tok[name], skel_b, 4.5, stated=False)
print("--- Glass bars (mute label over paper or wash content)")
row("mute on glass over paper", tok["mute"], glass_paper, 4.5, stated=False)
row("mute on glass over wash", tok["mute"], glass_wash, 4.5)
print("--- Documented limits (not text-safe; the doc says so)")
row("mute on skeleton shimmer, lighter", tok["mute"], skel_a, None)
row("mute on skeleton shimmer, darker", tok["mute"], skel_b, None)
row("mute on ink (glyph only, 3:1)", tok["mute"], ink, 3.0)
row("mute at 80% alpha on paper (never)", over(tok["mute"], 0.8, paper), paper, None)
print("--- Boundaries and focus (3:1)")
row("control on paper", tok["control"], paper, 3.0)
row("control on wash", tok["control"], wash, 3.0)
row("volt focus ring on paper", tok["volt"], paper, 3.0, stated=False)
row("volt focus ring on wash", tok["volt"], wash, 3.0, stated=False)
row("volt focus ring on ink", tok["volt"], ink, 3.0)
row("line on paper (dividers only)", tok["line"], paper, None)

print("--- Type scale (design.md, Typography)")
scale = {k: int(v) for k, v in re.findall(r"--text-([a-z]+):\s*(\d+)px", css)}
checks = [
    (f"{len(scale)} named sizes (at most 8)", len(scale) <= 8),
    ("body is 16px", scale.get("body") == 16),
    ("framework defaults reset (--text-*: initial)", "--text-*: initial" in css),
    ("doc lists every size", all(re.search(rf"\| `{n}` \| {px} \|", doc) for n, px in scale.items())),
]
stray = []
for base, _, files in os.walk(SRC):
    for f in files:
        if not f.endswith((".tsx", ".ts")):
            continue
        path = os.path.join(base, f)
        text = open(path, encoding="utf-8").read()
        for m in re.finditer(r'className=(?:"([^"]*)"|\{`([^`]*)`\})', text):
            cls = m.group(1) or m.group(2) or ""
            if re.search(r"(^|\s)mi(\s|$)", cls):
                continue
            for sz in re.findall(r"text-\[\d+(?:\.\d+)?px\]|\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b", cls):
                stray.append(f"{os.path.relpath(path, ROOT)}: {sz}")
checks.append((f"no stray text size outside the scale ({len(stray)} found; icon glyphs .mi are sized separately)", not stray))
for line in stray[:10]:
    print("      " + line)
for name, ok in checks:
    count += 1
    fails += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {name}")

print(f"\n{count - fails} of {count} checks pass")
print("ALL PASS" if not fails else "SOME FAIL")
sys.exit(1 if fails else 0)
