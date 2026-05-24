import { Chord, Note } from 'tonal'
import type { Quality } from '../theory/types'
import { QUALITY_TONAL } from '../theory/types'
import { noteToFreq } from '../theory/notes'

/** A chord we can voice: just a spelled root and a quality. */
export interface VoiceableChord {
  root: string
  quality: Quality
}

/**
 * Turn a chord into an ascending set of frequencies (a simple close voicing).
 * Chord tones are read from tonal, then assigned rising octaves starting near
 * `baseOctave` so the result always reads low-to-high.
 */
export function chordToFrequencies(
  chord: VoiceableChord,
  baseOctave = 4,
): number[] {
  const pitchClasses = Chord.getChord(
    QUALITY_TONAL[chord.quality],
    chord.root,
  ).notes
  if (pitchClasses.length === 0) return []

  let octave = baseOctave
  let prevChroma = -1
  const freqs: number[] = []

  for (const pc of pitchClasses) {
    const chroma = Note.chroma(pc) ?? 0
    // Once we stop ascending in pitch class, jump up an octave to stay rising.
    if (chroma <= prevChroma) octave += 1
    prevChroma = chroma
    const freq = noteToFreq(`${pc}${octave}`)
    if (freq !== null) freqs.push(freq)
  }

  return freqs
}
