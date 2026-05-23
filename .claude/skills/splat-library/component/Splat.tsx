import type { CSSProperties } from 'react'
import { SPLATS, type SplatMeta } from './splats'

interface SplatProps {
  /** "01" through "25" — the PNG file id. Mutually exclusive with `index`. */
  id?: string
  /** 0-based index into SPLATS. Mutually exclusive with `id`. */
  index?: number
  /** Tint colour. Defaults to `currentColor` so parents drive it. */
  color?: string
  /** Opacity 0..1 — useful for soft overlays. */
  opacity?: number
  /** Degrees of rotation applied as a CSS transform. */
  rotate?: number
  /** Horizontal / vertical flips for low-cost variation. */
  flipX?: boolean
  flipY?: boolean
  className?: string
  /** Extra style. Use this for sizing (`width: 200`) and positioning. */
  style?: CSSProperties
}

/**
 * Ink-splat decoration, rendered as a CSS-masked PNG sprite. The
 * sprite lives at /public/img/splats/splat-{id}.png and is tinted via
 * CSS `mask-image` + `background-color`, so the same asset works in
 * any colour without baking it into the file.
 *
 *   <Splat index={3} color="#ff3a8b" style={{ width: 200 }} />
 *   <Splat id="13" color="var(--accent)" style={{ width: 120 }} rotate={-8} />
 *
 * If the caller only sets `width` (or only `height`), we apply the
 * splat's native aspect-ratio so the other dimension follows.
 */
export default function Splat({
  id,
  index,
  color = 'currentColor',
  opacity = 1,
  rotate = 0,
  flipX = false,
  flipY = false,
  className,
  style,
}: SplatProps) {
  const meta: SplatMeta | undefined =
    typeof index === 'number'
      ? SPLATS[index % SPLATS.length]
      : SPLATS.find((s) => s.id === id) ?? SPLATS[0]
  if (!meta) return null

  const url = `/img/splats/splat-${meta.id}.png`
  const transforms: string[] = []
  if (rotate) transforms.push(`rotate(${rotate}deg)`)
  if (flipX) transforms.push('scaleX(-1)')
  if (flipY) transforms.push('scaleY(-1)')

  return (
    <span
      className={className}
      aria-hidden="true"
      style={
        {
          // Default aspect from the source PNG. A caller's explicit
          // aspect-ratio in `style` overrides this.
          aspectRatio: `${meta.width} / ${meta.height}`,
          ...style,
          display: 'inline-block',
          backgroundColor: color,
          opacity,
          transform: transforms.length ? transforms.join(' ') : undefined,
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        } as CSSProperties
      }
    />
  )
}
