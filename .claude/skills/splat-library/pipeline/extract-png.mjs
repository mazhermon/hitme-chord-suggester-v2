#!/usr/bin/env node
// Render the full pstoedit SVG at source resolution, then crop one
// transparent PNG per raster splat bbox. Preserves every fleck of
// original detail and segments cleanly (no path-assignment bleed).
import fs from 'node:fs'
import path from 'node:path'
import sharp from '/Users/mazhermon/Sites/mazhermondotcomv2/node_modules/sharp/lib/index.js'

const srcSvg = process.argv[2] // /tmp/splat-work/direct.svg
const rasterJson = process.argv[3] // /tmp/splat-work/out/splats.json
const outDir = process.argv[4] // /tmp/splat-work/out-png

fs.mkdirSync(path.join(outDir, 'tiles'), { recursive: true })

const EPS_W = 851
const EPS_H = 1134
const RENDER_W = 6808
const RENDER_H = 9072
const WORK_W = 1772
const WORK_H = 2363
const RENDER_PER_WORK_X = RENDER_W / WORK_W
const RENDER_PER_WORK_Y = RENDER_H / WORK_H

const rasterSplats = JSON.parse(fs.readFileSync(rasterJson, 'utf8'))

// Build a "normalised" version of the pstoedit SVG: replace the
// declared 8in × 8in / 0..1 viewBox + inner g transform with a
// straight viewBox covering the EPS bbox in path-coord space, plus
// a Y-flip so PostScript (y-up) paths render in SVG (y-down) coords.
// We strip the existing inner g transform line and replace all fills
// with currentColor so the rendered ink is uniform.
let raw = fs.readFileSync(srcSvg, 'utf8')
raw = raw.replace(/<rect[^>]*id="background"[^/]*\/>/, '')
// EPS embeds its black background as the FIRST polygon. Drop it so
// our rendered output is splats-on-transparent rather than splats on
// a giant black rectangle.
raw = raw.replace(/<polygon[^>]*\/>/, '')
raw = raw.replace(
  /<svg\b[^>]*>/,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${RENDER_W}" height="${RENDER_H}" viewBox="0 0 ${EPS_W} ${EPS_H}" preserveAspectRatio="xMidYMid meet">`
)
raw = raw.replace(
  /<g\b[^>]*transform="[^"]*"[^>]*>/,
  `<g transform="matrix(1 0 0 -1 0 ${EPS_H})">`
)
raw = raw.replace(/fill="[^"]+"/g, 'fill="#000000"')
raw = raw.replace(/stroke="[^"]+"/g, 'stroke="none"')

const aligned = path.join(outDir, 'aligned.svg')
fs.writeFileSync(aligned, raw)

// The aligned SVG now carries explicit width/height so sharp
// rasterises natively at the target resolution — no internal
// upsample, no softening, every spray fleck stays crisp on Retina.
const renderedBuf = await sharp(aligned)
  .raw()
  .ensureAlpha()
  .toBuffer({ resolveWithObject: true })

console.log(
  `rendered ${renderedBuf.info.width}×${renderedBuf.info.height} channels=${renderedBuf.info.channels}`
)

// The aligned SVG renders ink as black (RGB=0) on a transparent
// canvas. We just copy alpha through and force RGB=0 for clean
// black-on-transparent sprites. That makes them perfect mask images
// for CSS mask-image tinting.
const { width: rw, height: rh, channels } = renderedBuf.info
const inkBuf = Buffer.alloc(rw * rh * 4)
for (let p = 0; p < rw * rh; p++) {
  const i = p * channels
  const o = p * 4
  inkBuf[o] = 0
  inkBuf[o + 1] = 0
  inkBuf[o + 2] = 0
  inkBuf[o + 3] = renderedBuf.data[i + 3] // alpha straight through
}

await sharp(inkBuf, { raw: { width: rw, height: rh, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, 'sheet-alpha.png'))

// Crop one PNG per raster bbox. We pad the crop slightly so loose
// outer drops within ~25 work-pixels of the splat body come along.
const PAD_WORK = 25
const exportData = []
for (const s of rasterSplats) {
  const wx0 = Math.max(0, s.bbox.x - PAD_WORK)
  const wy0 = Math.max(0, s.bbox.y - PAD_WORK)
  const wx1 = Math.min(WORK_W, s.bbox.x + s.bbox.w + PAD_WORK)
  const wy1 = Math.min(WORK_H, s.bbox.y + s.bbox.h + PAD_WORK)
  const rx0 = Math.round(wx0 * RENDER_PER_WORK_X)
  const ry0 = Math.round(wy0 * RENDER_PER_WORK_Y)
  const rx1 = Math.round(wx1 * RENDER_PER_WORK_X)
  const ry1 = Math.round(wy1 * RENDER_PER_WORK_Y)
  const cw = rx1 - rx0
  const ch = ry1 - ry0
  const sliceBuf = Buffer.alloc(cw * ch * 4)
  for (let yy = 0; yy < ch; yy++) {
    const src = ((ry0 + yy) * rw + rx0) * 4
    inkBuf.copy(sliceBuf, yy * cw * 4, src, src + cw * 4)
  }
  const outPath = path.join(outDir, 'tiles', `splat-${s.id}.png`)
  await sharp(sliceBuf, { raw: { width: cw, height: ch, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  const sizeBytes = fs.statSync(outPath).size
  exportData.push({
    id: s.id,
    width: cw,
    height: ch,
    bytes: sizeBytes,
  })
  console.log(`splat-${s.id}: ${cw}×${ch}, ${(sizeBytes / 1024).toFixed(1)} KB`)
}

fs.writeFileSync(
  path.join(outDir, 'splats.json'),
  JSON.stringify(exportData, null, 2)
)
const total = exportData.reduce((a, b) => a + b.bytes, 0)
console.log(`total: ${(total / 1024).toFixed(1)} KB across ${exportData.length} PNGs`)
