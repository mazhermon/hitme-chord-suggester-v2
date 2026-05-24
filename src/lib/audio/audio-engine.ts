import { chordToFrequencies, type VoiceableChord } from './voicing'

/**
 * Minimal Web Audio API synth: schedules oscillator + gain "voices" with a short
 * envelope to play a chord or sequence a progression. Browser-only and guarded;
 * the pure note math lives in voicing.ts (which is unit-tested).
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

interface PlayOptions {
  /** Seconds the chord rings for. */
  duration?: number
  /** Delay before the chord starts, in seconds from now. */
  when?: number
  /** Peak gain per voice. */
  gain?: number
}

function playFrequencies(freqs: number[], options: PlayOptions = {}): void {
  const audio = getAudioContext()
  if (!audio || !masterGain || freqs.length === 0) return

  const { duration = 1.2, when = 0, gain = 0.22 } = options
  const start = audio.currentTime + when
  const attack = 0.012
  const release = 0.3

  const voice = audio.createGain()
  voice.connect(masterGain)
  voice.gain.setValueAtTime(0, start)
  voice.gain.linearRampToValueAtTime(gain, start + attack)
  voice.gain.setValueAtTime(gain, start + Math.max(attack, duration - release))
  voice.gain.linearRampToValueAtTime(0.0001, start + duration)

  for (const frequency of freqs) {
    const osc = audio.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = frequency
    osc.connect(voice)
    osc.start(start)
    osc.stop(start + duration + 0.05)
  }
}

/** Play a single chord now (or after `when` seconds). */
export function playChord(chord: VoiceableChord, options?: PlayOptions): void {
  playFrequencies(chordToFrequencies(chord), options)
}

export interface ProgressionOptions {
  bpm?: number
  beatsPerChord?: number
}

/**
 * Sequence a progression at a tempo. Returns the total duration in seconds so
 * the UI can show play progress.
 */
export function playProgression(
  chords: VoiceableChord[],
  options: ProgressionOptions = {},
): number {
  const { bpm = 90, beatsPerChord = 2 } = options
  const secondsPerChord = (60 / bpm) * beatsPerChord
  chords.forEach((chord, i) => {
    playChord(chord, {
      when: i * secondsPerChord,
      duration: secondsPerChord * 0.95,
    })
  })
  return chords.length * secondsPerChord
}
