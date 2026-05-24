import { Chord, Note } from 'tonal'
import type { Quality } from '../theory/types'
import { QUALITY_TONAL } from '../theory/types'
import { renderQuality, type ExtensionLevel } from '../theory/extensions'
import { midiToFreq } from '../theory/notes'

/** A chord we can voice: a spelled root and a quality. */
export interface VoiceableChord {
  root: string
  quality: Quality
}

export interface VoiceOptions {
  /** Extension level. If omitted, the quality's own natural form is used. */
  level?: ExtensionLevel
  /** Voicing variant index (cycles VOICING_NAMES). */
  voicing?: number
  baseOctave?: number
}

/** Voicing variants applied to an ascending MIDI note set. */
export const VOICING_NAMES = [
  'Close',
  '1st inversion',
  '2nd inversion',
  'Drop 2',
  'Open',
  'Octave up',
] as const

type Transform = (midi: number[]) => number[]

const VOICINGS: Transform[] = [
  // Close (root position)
  (m) => m,
  // 1st inversion: lowest note up an octave
  (m) => sorted([m[0] + 12, ...m.slice(1)]),
  // 2nd inversion: lowest two notes up an octave
  (m) => sorted([m[0] + 12, (m[1] ?? m[0]) + 12, ...m.slice(2)]),
  // Drop 2: second-from-top down an octave
  (m) =>
    m.length < 2
      ? m
      : sorted([...m.slice(0, -2), m[m.length - 2] - 12, m[m.length - 1]]),
  // Open: lift every other note (from the 2nd) up an octave for a spread sound
  (m) => sorted(m.map((n, i) => (i % 2 === 1 ? n + 12 : n))),
  // Octave up
  (m) => m.map((n) => n + 12),
]

function sorted(m: number[]): number[] {
  return [...m].sort((a, b) => a - b)
}

/**
 * Turn a chord into a set of MIDI note numbers. Chord tones come from tonal;
 * octaves rise so the base voicing reads low-to-high, then a voicing transform
 * is applied. Shared by the audio synth and the piano/keyboard diagram.
 */
export function chordToMidi(
  chord: VoiceableChord,
  options: VoiceOptions = {},
): number[] {
  const { level, voicing = 0, baseOctave = 4 } = options
  const tonalType = level
    ? renderQuality(chord.quality, level).tonalType
    : QUALITY_TONAL[chord.quality]

  const pitchClasses = Chord.getChord(tonalType, chord.root).notes
  if (pitchClasses.length === 0) return []

  // Assign rising octaves so pitch classes stack upward.
  let octave = baseOctave
  let prevChroma = -1
  const midi: number[] = []
  for (const pc of pitchClasses) {
    const chroma = Note.chroma(pc) ?? 0
    if (chroma <= prevChroma) octave += 1
    prevChroma = chroma
    const m = Note.midi(`${pc}${octave}`)
    if (m !== null) midi.push(m)
  }

  const transform =
    VOICINGS[((voicing % VOICINGS.length) + VOICINGS.length) % VOICINGS.length]
  return transform(midi)
}

/** Turn a chord into a set of frequencies (Hz) — the voiced MIDI notes as pitches. */
export function chordToFrequencies(
  chord: VoiceableChord,
  options: VoiceOptions = {},
): number[] {
  return chordToMidi(chord, options).map(midiToFreq)
}
