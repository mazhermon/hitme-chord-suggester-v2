import { chordToFrequencies, type VoiceableChord } from './voicing'
import {
  DEFAULT_ENVELOPE,
  resolveMix,
  type EnvelopeSettings,
  type Waveform,
} from './envelope'
import type { ExtensionFlags } from '../theory/extensions'
import { midiToFreq } from '../theory/notes'

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
  /**
   * Where the voice's output should land. Defaults to the master gain node;
   * playProgression overrides this so it can group-disconnect on stop().
   */
  output?: AudioNode
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
  voice.connect(options.output ?? masterGain)
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

  // For each waveform with a non-zero mix value, create a per-waveform gain
  // node at the normalised fraction, then layer one oscillator per frequency
  // through it into the voice gain. Total amplitude across all waveforms is
  // always 1× (no clipping, regardless of how many waveforms are mixed).
  // Track oscillator end so we can disconnect every node we created — without
  // this each chord would leak nodes into masterGain.
  const entries = resolveMix(env)
  const mixGains: GainNode[] = entries.map(([, fraction]) => {
    const g = audio.createGain()
    g.gain.value = fraction
    g.connect(voice)
    return g
  })
  let remaining = freqs.length * entries.length
  for (const frequency of freqs) {
    entries.forEach(([wf], i) => {
      const osc = audio.createOscillator()
      osc.type = wf as Waveform
      osc.frequency.value = frequency
      osc.connect(mixGains[i])
      osc.start(start)
      osc.stop(stopAt)
      osc.onended = () => {
        if (--remaining === 0) {
          for (const g of mixGains) g.disconnect()
          voice.disconnect()
        }
      }
    })
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

/**
 * Play a single note (used to preview a chord's root the moment the user
 * taps a numeral in the dock — so they hear what they're inputting even
 * before the chord is rendered). Short, quiet, blocky.
 */
export function playNote(
  midi: number,
  options: PlayOptions = {},
): void {
  const freq = midiToFreq(midi)
  playFrequencies([freq], {
    duration: 0.5,
    gain: 0.18,
    ...options,
  })
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

/** Handle to an in-flight progression. `duration` is the total schedule length. */
export interface PlaybackHandle {
  duration: number
  /** Cut audio immediately (50 ms fade to avoid a click). */
  stop(): void
}

/**
 * Sequence a progression at a tempo. Returns a handle the UI can use to stop
 * playback mid-way. All voices route through a session gain we own, so stop()
 * is a single disconnect that takes everything down at once.
 */
export function playProgression(
  chords: PlayableChord[],
  options: ProgressionOptions = {},
): PlaybackHandle {
  const audio = getAudioContext()
  const { bpm = 90, beatsPerChord = 2, extensions, envelope, baseOctave } =
    options
  const secondsPerChord = (60 / bpm) * beatsPerChord
  const duration = chords.length * secondsPerChord

  if (!audio || !masterGain || chords.length === 0) {
    return { duration, stop: () => {} }
  }

  const session = audio.createGain()
  session.connect(masterGain)

  chords.forEach((chord, i) => {
    playChord(chord, {
      extensions: extensions?.[i],
      envelope,
      baseOctave,
      when: i * secondsPerChord,
      duration: secondsPerChord * 0.95,
      output: session,
    })
  })

  let stopped = false
  return {
    duration,
    stop() {
      if (stopped || !audio) return
      stopped = true
      const now = audio.currentTime
      // Quick fade so the cut doesn't click; then disconnect the whole session.
      try {
        session.gain.cancelScheduledValues(now)
        session.gain.setValueAtTime(session.gain.value, now)
        session.gain.linearRampToValueAtTime(0.0001, now + 0.05)
      } catch {
        /* node already gone — fine */
      }
      setTimeout(() => {
        try {
          session.disconnect()
        } catch {
          /* already disconnected */
        }
      }, 80)
    },
  }
}
