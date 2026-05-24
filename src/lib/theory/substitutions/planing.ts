import { Note } from 'tonal'
import type { Chord } from '../types'
import { chordSymbol } from '../chords'
import type { SubstitutionStrategy } from './types'

// Common house "pitched stab" moves: keep the exact shape, shift it up/down.
const MOVES: { interval: string; label: string }[] = [
  { interval: '2M', label: 'planed ↑M2' },
  { interval: '-2M', label: 'planed ↓M2' },
  { interval: '4P', label: 'planed ↑P4' },
  { interval: '5P', label: 'planed ↑P5' },
  { interval: '-3m', label: 'planed ↓m3' },
]

/**
 * Planing: transpose the whole chord by a fixed interval, keeping its exact
 * quality (parallel motion). This is the classic house technique of sampling a
 * chord stab and pitching it up/down the keyboard — each move is, in theory,
 * just the same chord on a new root.
 */
export const planing: SubstitutionStrategy = {
  id: 'planing',
  label: 'Planing (pitch shift)',
  suggest({ chord }) {
    const results: Chord[] = []
    for (const { interval, label } of MOVES) {
      const root = Note.transpose(chord.root, interval)
      if (!root || root === chord.root) continue
      results.push({
        degree: chord.degree,
        root,
        quality: chord.quality,
        symbol: chordSymbol(root, chord.quality),
        source: label,
      })
    }
    return results
  },
}
