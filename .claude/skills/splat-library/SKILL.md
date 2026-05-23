---
name: splat-library
description: Use when the user wants to harvest a sheet of ink-splat / paint-splat / texture shapes (typically a multi-shape EPS or high-res image) into a tintable PNG-mask sprite library for the web. Produces 25-ish individual transparent PNGs that can be coloured at runtime via CSS mask-image + background-color.
---

# Splat Library

A reusable pipeline + drop-in React component for turning a sheet of ink-splat shapes (EPS, AI export, or a high-res raster) into a small library of tintable web sprites.

## When to use

The user has a source asset — usually an EPS file with multiple paint splats / drips / strokes laid out together, or a single high-res photo of marks on a page — and wants those shapes available as reusable web decorations that can be tinted to any brand colour at runtime.

## When NOT to use

- The user only needs a single shape (just trace it once with potrace / inkscape, no pipeline needed)
- The user wants the splats as SVG paths with the original colours baked in (use `pstoedit -f plot-svg` directly)
- The user wants animated / morphable shapes (PNG masks are static)

## What this produces

- N transparent PNG sprites at `/public/img/splats/splat-NN.png`, one per splat, ink-black on transparent
- A `splats.ts` metadata module that lists each sprite's id + native pixel dimensions
- A `<Splat>` React component that renders a sprite tintable via the `color` prop

Total weight for ~25 splats at 8× source res: roughly 1.5 MB.

## Pipeline overview

```
source.eps
   ↓        ghostscript: rasterise to grayscale at high dpi
sheet.png  (e.g. 7087×9449)
   ↓        sharp + custom JS: connected components + flood-fill
   ↓        find 25-ish splat bboxes in the rasterised sheet
splats.json (raster bboxes per splat)

source.eps
   ↓        pstoedit: convert vector paths
direct.svg (full vector source, all paths preserved)
   ↓        sharp: render at 8× source res with explicit width/height
   ↓        slice per raster bbox, output transparent PNG (alpha-only ink)
/public/img/splats/splat-NN.png × 25
```

The PNG approach is the canonical one — it sidesteps the per-path-to-splat assignment problem and gives full source fidelity with crisp Retina-ready alpha masks at ~60 KB per splat.

## Step-by-step

### 1. Install tooling

```bash
brew install ghostscript pstoedit
# sharp is usually a transitive dep of Next.js. Add it directly if not:
yarn add -D sharp
```

### 2. Get the EPS bounding box from the source

```bash
head -c 2000 source.eps | strings | grep -i BoundingBox
# %%BoundingBox: 0 0 851 1134     ← note these numbers
```

You'll plug these into `EPS_W` / `EPS_H` in the extract script (defaults to 851 × 1134).

### 3. Rasterise the EPS

```bash
mkdir -p /tmp/splat-work
gs -dNOPAUSE -dBATCH -dSAFER -dEPSCrop \
   -sDEVICE=pnggray -r600 \
   -dGraphicsAlphaBits=4 -dTextAlphaBits=4 \
   -sOutputFile=/tmp/splat-work/sheet.png \
   source.eps
```

### 4. Detect splat bboxes in the raster

You need a `/tmp/splat-work/out/splats.json` that describes each splat's working-frame bbox. The format is:

```json
[
  { "id": "01", "bbox": { "x": 34, "y": 70, "w": 391, "h": 151 } },
  { "id": "02", "bbox": { "x": 414, "y": 130, "w": 140, "h": 96 } },
  …
]
```

Working frame is the sheet downsampled to 1772 × 2363 (4× downscale). For most sheets you can use the included `extract-bboxes.mjs` (run on `sheet.png`) which does connected-components + flood-fill. If the layout is unusual, hand-author the JSON.

### 5. Convert EPS to vector SVG

```bash
pstoedit -f plot-svg source.eps /tmp/splat-work/direct.svg
```

This is the master copy — every path preserved, with the original colours.

### 6. Render + slice the PNG sprites

Copy `pipeline/extract-png.mjs` into your project. Adjust `EPS_W` / `EPS_H` to match your source. Run:

```bash
node pipeline/extract-png.mjs \
  /tmp/splat-work/direct.svg \
  /tmp/splat-work/out/splats.json \
  ./public/img/splats
```

Output: 25 transparent PNG masks in `public/img/splats/` + an `splats.json` manifest.

### 7. Generate the TypeScript metadata module

```bash
node pipeline/build-png-ts.mjs
```

Writes `src/components/decor/splats.ts` with each sprite's id + dimensions.

### 8. Drop in the `<Splat>` component

Copy `component/Splat.tsx` into your project (e.g. at `src/components/decor/`). Usage:

```tsx
import Splat from '@/components/decor/Splat'

<Splat id="13" color="#ff3a8b" style={{ width: 200 }} />
<Splat index={3} color="currentColor" rotate={-8} flipX />
```

It renders a `<span>` with `mask-image` + `background-color`, sized from inline `style` (defaults to the PNG's native aspect-ratio if you only set one dimension).

## Why PNG masks beat traced SVG

For naturalistic ink splats, the source EPS has thousands of tiny droplet paths. Tracing the raster smoothens them into a single silhouette, losing the spray-paint texture. Direct vector conversion preserves everything but is heavy (4 MB SVG) and segmentation by path-to-bbox is fragile. PNG masks at 8× source res preserve every fleck, segment cleanly via image crop (no path assignment needed), and stay sharp on Retina at any realistic display size.

## Files in this skill

- `pipeline/extract-png.mjs` — main render + slice pipeline
- `pipeline/build-png-ts.mjs` — generates the TS metadata module
- `component/Splat.tsx` — the React component
