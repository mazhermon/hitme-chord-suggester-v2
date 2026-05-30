import { chordToFrequencies, type VoiceableChord } from './voicing'
import { DEFAULT_ENVELOPE, type EnvelopeSettings } from './envelope'
import type { ExtensionFlags } from '../theory/extensions'

/**
 * Web Audio API synth: schedules oscillator + gain "voices" with an ADSR
 * envelope to play a chord or sequence a progression. Browser-only and guarded;
 * the note math lives in voicing.ts (unit-tested).
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }
interface MobileNavigator {
  audioSession?: { type: string }
}

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false
let foregroundResumeBound = false
const MASTER_LEVEL = 0.8

/** Seconds between notes when a chord is arpeggiated (shared with the piano UI). */
export const ARPEGGIO_STEP = 0.16

/**
 * Make audio actually play on phones. iOS routes Web Audio through the "ambient"
 * session by default, so the ring/silent switch mutes it; `audioSession = 'playback'`
 * (iOS 16.4+) plays regardless. We also start a one-sample silent buffer, the
 * long-standing trick to fully "unlock" the context on the first gesture.
 * Exported for testing; safe + no-op where the APIs don't exist.
 */
export function primeAudioForMobile(
  audio: AudioContext,
  nav: MobileNavigator,
): void {
  if (nav.audioSession) {
    try {
      nav.audioSession.type = 'playback'
    } catch {
      /* read-only on this OS — ignore */
    }
  }
  try {
    const source = audio.createBufferSource()
    source.buffer = audio.createBuffer(1, 1, 22050)
    source.connect(audio.destination)
    source.start(0)
  } catch {
    /* unlock kick unsupported — harmless */
  }
}

/** Lazily create (and resume) the AudioContext. Call from a user gesture. */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    masterGain = ctx.createGain()
    masterGain.gain.value = muted ? 0 : MASTER_LEVEL
    masterGain.connect(ctx.destination)
    primeAudioForMobile(ctx, navigator as MobileNavigator)

    // iOS suspends the context when the tab is backgrounded — wake it on return.
    if (!foregroundResumeBound && typeof document !== 'undefined') {
      foregroundResumeBound = true
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && ctx?.state === 'suspended') {
          void ctx.resume()
        }
      })
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(value: boolean): void {
  muted = value
  if (ctx && masterGain) {
    masterGain.gain.setValueAtTime(value ? 0 : MASTER_LEVEL, ctx.currentTime)
  }
}

/**
 * Tap the master output into a MediaStream so the synth can be recorded into a
 * video. The caller owns the node and must `.disconnect()` it when done so the
 * tap doesn't linger across exports. Returns null when audio is unavailable.
 */
export function createCaptureNode(): MediaStreamAudioDestinationNode | null {
  const audio = getAudioContext()
  if (!audio || !masterGain) return null
  const dest = audio.createMediaStreamDestination()
  masterGain.connect(dest)
  return dest
}

type PlayableChord = VoiceableChord & { voicing?: number }

interface PlayOptions {
  extensions?: ExtensionFlags
  envelope?: EnvelopeSettings
  duration?: number
  when?: number
  gain?: number
  /** Octave the voicing is built on (default 4); shift to pitch up/down. */
  baseOctave?: number
  /** Spell the chord out one note at a time instead of as a block. */
  arpeggio?: boolean
  /** Seconds between arpeggiated notes. */
  strum?: number
}

function playFrequencies(freqs: number[], options: PlayOptions = {}): void {
  const audio = getAudioContext()
  if (!audio || !masterGain || freqs.length === 0) return

  const env = options.envelope ?? DEFAULT_ENVELOPE
  const { duration = 1.2, when = 0, gain = 0.22 } = options
  const start = audio.currentTime + when
  const peak = gain
  const sustainLevel = Math.max(0.0001, peak * env.sustain)

  const voice = audio.createGain()
  voice.connect(masterGain)
  // ADSR
  voice.gain.setValueAtTime(0.0001, start)
  voice.gain.linearRampToValueAtTime(peak, start + env.attack)
  voice.gain.linearRampToValueAtTime(
    sustainLevel,
    start + env.attack + env.decay,
  )
  const releaseStart = Math.max(
    start + env.attack + env.decay,
    start + duration - env.release,
  )
  voice.gain.setValueAtTime(sustainLevel, releaseStart)
  voice.gain.linearRampToValueAtTime(0.0001, releaseStart + env.release)
  const stopAt = releaseStart + env.release + 0.05

  // Track when the last oscillator ends so we can disconnect the voice gain
  // node. Without this, every chord leaks a GainNode that stays connected to
  // masterGain forever — small but unbounded over a long session.
  let remaining = freqs.length
  for (const frequency of freqs) {
    const osc = audio.createOscillator()
    osc.type = env.waveform
    osc.frequency.value = frequency
    osc.connect(voice)
    osc.start(start)
    osc.stop(stopAt)
    osc.onended = () => {
      if (--remaining === 0) voice.disconnect()
    }
  }
}

/** Play a single chord now (or after `when` seconds), using its own voicing. */
export function playChord(
  chord: PlayableChord,
  options: PlayOptions = {},
): void {
  const freqs = chordToFrequencies(chord, {
    extensions: options.extensions,
    voicing: chord.voicing,
    baseOctave: options.baseOctave,
  })
  if (options.arpeggio) {
    // Spell the chord out, low to high.
    const step = options.strum ?? ARPEGGIO_STEP
    const base = options.when ?? 0
    freqs.forEach((f, i) =>
      playFrequencies([f], {
        ...options,
        when: base + i * step,
        duration: options.duration ?? 0.6,
      }),
    )
    return
  }
  playFrequencies(freqs, options)
}

export interface ProgressionOptions {
  bpm?: number
  beatsPerChord?: number
  /** Extension flags per chord (aligned to `chords`). */
  extensions?: ExtensionFlags[]
  envelope?: EnvelopeSettings
  /** Octave the voicing is built on (default 4); shift to pitch up/down. */
  baseOctave?: number
}

/**
 * Sequence a progression at a tempo. Returns the total duration in seconds so
 * the UI can show play progress.
 */
export function playProgression(
  chords: PlayableChord[],
  options: ProgressionOptions = {},
): number {
  const { bpm = 90, beatsPerChord = 2, extensions, envelope, baseOctave } =
    options
  const secondsPerChord = (60 / bpm) * beatsPerChord
  chords.forEach((chord, i) => {
    playChord(chord, {
      extensions: extensions?.[i],
      envelope,
      baseOctave,
      when: i * secondsPerChord,
      duration: secondsPerChord * 0.95,
    })
  })
  return chords.length * secondsPerChord
}
