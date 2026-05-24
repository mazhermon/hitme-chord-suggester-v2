import { chordToFrequencies, type VoiceableChord } from './voicing'
import { DEFAULT_ENVELOPE, type EnvelopeSettings } from './envelope'
import type { ExtensionLevel } from '../theory/extensions'

/**
 * Web Audio API synth: schedules oscillator + gain "voices" with an ADSR
 * envelope to play a chord or sequence a progression. Browser-only and guarded;
 * the note math lives in voicing.ts (unit-tested).
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false
const MASTER_LEVEL = 0.8

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

export function isMuted(): boolean {
  return muted
}

type PlayableChord = VoiceableChord & { voicing?: number }

interface PlayOptions {
  level?: ExtensionLevel
  envelope?: EnvelopeSettings
  duration?: number
  when?: number
  gain?: number
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

  for (const frequency of freqs) {
    const osc = audio.createOscillator()
    osc.type = env.waveform
    osc.frequency.value = frequency
    osc.connect(voice)
    osc.start(start)
    osc.stop(stopAt)
  }
}

/** Play a single chord now (or after `when` seconds), using its own voicing. */
export function playChord(
  chord: PlayableChord,
  options: PlayOptions = {},
): void {
  const freqs = chordToFrequencies(chord, {
    level: options.level,
    voicing: chord.voicing,
  })
  playFrequencies(freqs, options)
}

export interface ProgressionOptions {
  bpm?: number
  beatsPerChord?: number
  level?: ExtensionLevel
  envelope?: EnvelopeSettings
}

/**
 * Sequence a progression at a tempo. Returns the total duration in seconds so
 * the UI can show play progress.
 */
export function playProgression(
  chords: PlayableChord[],
  options: ProgressionOptions = {},
): number {
  const { bpm = 90, beatsPerChord = 2, level, envelope } = options
  const secondsPerChord = (60 / bpm) * beatsPerChord
  chords.forEach((chord, i) => {
    playChord(chord, {
      level,
      envelope,
      when: i * secondsPerChord,
      duration: secondsPerChord * 0.95,
    })
  })
  return chords.length * secondsPerChord
}
