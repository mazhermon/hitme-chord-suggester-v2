const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]) // C# D# F# G# A#

/** Is this MIDI note a black (sharp/flat) key? */
export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12)
}

/** Expand a set of notes to the whole octaves (C..B) that contain them. */
export function keyboardRange(notes: number[]): { start: number; end: number } {
  if (notes.length === 0) return { start: 60, end: 71 }
  const low = Math.min(...notes)
  const high = Math.max(...notes)
  const start = low - (((low % 12) + 12) % 12) // down to C
  const end = high + (11 - (((high % 12) + 12) % 12)) // up to B
  return { start, end }
}

/** White-key MIDI numbers within an inclusive range, low → high. */
export function whiteKeysIn(start: number, end: number): number[] {
  const keys: number[] = []
  for (let m = start; m <= end; m++) {
    if (!isBlackKey(m)) keys.push(m)
  }
  return keys
}
