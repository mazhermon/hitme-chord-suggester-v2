#!/usr/bin/env node
import fs from 'node:fs'
const data = JSON.parse(
  fs.readFileSync('/tmp/splat-work/out-png/splats.json', 'utf8')
)
const meta = data.map((d) => ({ id: d.id, width: d.width, height: d.height }))
const body = `// AUTO-GENERATED from the PNG sprite library at /public/img/splats/.
// Each entry references /public/img/splats/splat-{id}.png. Width and
// height are the PNG's native dimensions; <Splat> uses them to set
// aspect-ratio so callers only have to size one dimension.

export interface SplatMeta {
  id: string
  width: number
  height: number
}

export const SPLATS: SplatMeta[] = ${JSON.stringify(meta, null, 2)}
`
fs.writeFileSync(
  '/Users/mazhermon/Sites/mazhermondotcomv2/src/components/decor/splats.ts',
  body
)
console.log('wrote', body.length, 'bytes')
