import { Note } from 'tonal'

/** Note name (e.g. "C4", "Eb3") → MIDI number, or null if unparseable. */
export function noteToMidi(note: string): number | null {
  const midi = Note.midi(note)
  return midi ?? null
}

/** MIDI number → frequency in Hz (equal temperament, A4 = 440Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Note name → frequency in Hz, or null if unparseable. */
export function noteToFreq(note: string): number | null {
  const midi = noteToMidi(note)
  return midi === null ? null : midiToFreq(midi)
}
