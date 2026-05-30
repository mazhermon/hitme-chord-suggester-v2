import type { Chord } from '@/lib/theory/types'
import { romanForDegree } from '@/lib/theory/nashville'
import {
  renderSymbol,
  flagsFromLevel,
  type ExtensionFlags,
} from '@/lib/theory/extensions'
import {
  getAudioContext,
  createCaptureNode,
  playProgression,
} from '@/lib/audio/audio-engine'
import type { EnvelopeSettings } from '@/lib/audio/envelope'
import { chordTimeline, activeIndexAt } from './timeline'

/**
 * Renders a chord progression to a shareable 9:16 video entirely in the browser
 * — no server, no cost. A canvas is animated in time with the synth (whose
 * master output is tapped via `createCaptureNode`) and captured with
 * MediaRecorder. Audio is mixed in where the browser allows; otherwise the clip
 * is silent (the picture still works).
 */

// Drawing happens in "design units" (a 1080×1920 frame) and is rasterised down to
// the output size below — keeps text crisp while keeping the pixel count (and so
// the file) small.
const WIDTH = 1080
const HEIGHT = 1920
const OUTPUT_W = 720
const OUTPUT_H = 1280
const FPS = 30
const TAIL = 0.6 // let the last chord ring before we stop
// Cap the bitrate. Uncapped, Chrome can pick a huge VP9 bitrate for a tall canvas
// (hundreds of MB); ~3 Mbps keeps a short 9:16 clip to a few MB and still looks sharp.
const VIDEO_BPS = 3_000_000
const AUDIO_BPS = 128_000

const COLOR = {
  bgTop: '#3d5538',
  bgBottom: '#2a352a',
  cream: '#f4f4ec',
  teal: '#6fae9f',
  muted: 'rgba(244,244,236,0.6)',
  track: 'rgba(244,244,236,0.18)',
  ink: '#22301f',
}

const DEFAULT_EXT = flagsFromLevel('seventh')

// Prefer MP4 (H.264/AAC): it plays natively on macOS/iOS (webm does not) and is
// the format TikTok/Instagram/Facebook expect. Recent Chrome and Safari can
// record MP4; otherwise we fall back to webm (still uploadable, previews in-app).
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.4d002a,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

/** Whether the current browser can produce a video at all. */
export function canExportVideo(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickMimeType() !== ''
  )
}

interface FrameData {
  symbols: string[]
  romans: string[]
  activeIndex: number
  progress: number
}

function drawFrame(g: CanvasRenderingContext2D, data: FrameData): void {
  const { symbols, romans, activeIndex, progress } = data

  // Map the 1080×1920 design space onto the smaller output canvas.
  g.setTransform(OUTPUT_W / WIDTH, 0, 0, OUTPUT_H / HEIGHT, 0, 0)

  // Background
  const bg = g.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, COLOR.bgTop)
  bg.addColorStop(1, COLOR.bgBottom)
  g.fillStyle = bg
  g.fillRect(0, 0, WIDTH, HEIGHT)

  g.textAlign = 'center'
  g.textBaseline = 'middle'

  // Wordmark
  g.fillStyle = COLOR.cream
  g.font = '700 72px Georgia, "Times New Roman", serif'
  g.fillText('Hit me', WIDTH / 2, 200)
  g.fillStyle = COLOR.muted
  g.font = '400 32px system-ui, sans-serif'
  g.fillText('chord progression', WIDTH / 2, 270)

  // Active chord — numeral + big symbol
  const active = symbols[activeIndex] ?? ''
  const roman = romans[activeIndex] ?? ''
  g.fillStyle = COLOR.teal
  g.font = '700 60px Georgia, serif'
  g.fillText(roman, WIDTH / 2, 740)

  let symSize = 168
  g.fillStyle = COLOR.cream
  do {
    g.font = `700 ${symSize}px Georgia, serif`
    if (g.measureText(active).width <= WIDTH - 200) break
    symSize -= 8
  } while (symSize > 64)
  g.fillText(active, WIDTH / 2, 920)

  // Pill row of the whole progression
  const padX = 26
  const gap = 18
  const pillH = 96
  const measure = (size: number) => {
    g.font = `600 ${size}px system-ui, sans-serif`
    return symbols.reduce(
      (acc, s) => acc + g.measureText(s).width + padX * 2 + gap,
      -gap,
    )
  }
  let pillSize = 46
  while (measure(pillSize) > WIDTH - 100 && pillSize > 22) pillSize -= 2
  const rowW = measure(pillSize)
  let x = (WIDTH - rowW) / 2
  const pillY = 1300
  symbols.forEach((s, i) => {
    g.font = `600 ${pillSize}px system-ui, sans-serif`
    const w = g.measureText(s).width + padX * 2
    const on = i === activeIndex
    g.fillStyle = on ? COLOR.teal : 'rgba(244,244,236,0.08)'
    g.beginPath()
    g.roundRect(x, pillY - pillH / 2, w, pillH, 22)
    g.fill()
    if (!on) {
      g.strokeStyle = 'rgba(244,244,236,0.35)'
      g.lineWidth = 2
      g.stroke()
    }
    g.fillStyle = on ? COLOR.ink : COLOR.cream
    g.fillText(s, x + w / 2, pillY)
    x += w + gap
  })

  // Progress bar
  const trackW = WIDTH - 160
  const trackX = 80
  const trackY = 1640
  g.fillStyle = COLOR.track
  g.beginPath()
  g.roundRect(trackX, trackY, trackW, 12, 6)
  g.fill()
  g.fillStyle = COLOR.teal
  g.beginPath()
  g.roundRect(trackX, trackY, trackW * Math.min(1, Math.max(0, progress)), 12, 6)
  g.fill()

  // Watermark
  g.fillStyle = COLOR.muted
  g.font = '400 32px system-ui, sans-serif'
  g.fillText('hitme.mazhermon.com', WIDTH / 2, 1800)
}

export interface ExportVideoOptions {
  extensions?: ExtensionFlags[]
  bpm?: number
  beatsPerChord?: number
  envelope?: EnvelopeSettings
  /** Octave the voicing is built on (default 4); shift to pitch up/down. */
  baseOctave?: number
  /** Record the synth into the clip (default true); falls back to silent. */
  withAudio?: boolean
  /** 0..1 progress callback for UI. */
  onProgress?: (p: number) => void
}

/** Render the progression to a video Blob. Resolves when recording finishes. */
export function exportProgressionVideo(
  chords: Chord[],
  options: ExportVideoOptions = {},
): Promise<Blob> {
  const {
    extensions,
    bpm = 90,
    beatsPerChord = 2,
    envelope,
    baseOctave,
    withAudio = true,
    onProgress,
  } = options

  if (chords.length === 0) {
    return Promise.reject(new Error('Add some chords first.'))
  }
  if (!canExportVideo()) {
    return Promise.reject(
      new Error("Video export isn't supported in this browser."),
    )
  }

  // Extension flags are aligned to chord position (not scale degree).
  const symbols = chords.map((c, i) =>
    renderSymbol(c.root, c.quality, extensions?.[i] ?? DEFAULT_EXT),
  )
  const romans = chords.map((c) => romanForDegree(c.degree))

  const { slots, duration } = chordTimeline(chords.length, {
    bpm,
    beatsPerChord,
  })

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_W
  canvas.height = OUTPUT_H
  const g = canvas.getContext('2d')
  if (!g) return Promise.reject(new Error('Canvas is unavailable.'))

  // Audio tap (optional). If unavailable we record a silent clip.
  const capture = withAudio ? createCaptureNode() : null
  const audioTracks = capture?.stream.getAudioTracks() ?? []

  const stream = canvas.captureStream(FPS)
  const combined = new MediaStream([
    ...stream.getVideoTracks(),
    ...audioTracks,
  ])

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: VIDEO_BPS,
    audioBitsPerSecond: AUDIO_BPS,
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  // Paint the first frame so the stream doesn't start blank.
  drawFrame(g, { symbols, romans, activeIndex: 0, progress: 0 })

  const total = duration + TAIL

  return new Promise<Blob>((resolve, reject) => {
    const finish = () => {
      if (recorder.state !== 'inactive') recorder.stop()
    }
    recorder.onstop = () => {
      capture?.disconnect()
      resolve(new Blob(chunks, { type: mimeType || 'video/webm' }))
    }

    recorder.start()

    const audio = capture ? getAudioContext() : null
    if (capture && audio) {
      playProgression(chords, {
        bpm,
        beatsPerChord,
        extensions,
        envelope,
        baseOctave,
      })
    }
    // The STOP is driven by the wall clock (always advances), plus a setTimeout
    // backstop in case rAF is throttled (e.g. a hidden tab). The audio clock is
    // used only to sync the picture, and only while it's actually running — a
    // suspended context must never be able to stall the loop into a giant file.
    const perf0 = performance.now()
    const audioT0 = audio ? audio.currentTime : 0
    const safety = setTimeout(finish, (total + 1) * 1000)

    recorder.onerror = () => {
      clearTimeout(safety)
      capture?.disconnect()
      reject(new Error('Recording failed.'))
    }

    const tick = () => {
      const wall = (performance.now() - perf0) / 1000
      const t =
        audio && audio.state === 'running' ? audio.currentTime - audioT0 : wall
      const progress = duration ? Math.min(t / duration, 1) : 1
      drawFrame(g, {
        symbols,
        romans,
        activeIndex: activeIndexAt(slots, t),
        progress,
      })
      onProgress?.(progress)
      if (wall < total) {
        requestAnimationFrame(tick)
      } else {
        clearTimeout(safety)
        finish()
      }
    }
    requestAnimationFrame(tick)
  })
}

// String helpers (BRAND, progressionBasename, videoFilename, videoFile) live
// in naming.ts so callers can import them without pulling in MediaRecorder +
// canvas code. Re-export here so existing call sites keep working.
export {
  BRAND,
  progressionBasename,
  videoFilename,
  videoFile,
} from './naming'
import { BRAND, videoFilename } from './naming'

/** Trigger a browser download of an exported video Blob. */
export function downloadVideo(blob: Blob, basename = BRAND): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = videoFilename(blob, basename)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  // Remove + revoke on a delay: some browsers cancel the download if the anchor
  // or its object URL disappears immediately after the click.
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 4000)
}
