import type { Chord, KeyContext } from '../types'

/** Everything a strategy needs to evaluate one chord in context. */
export interface SubstitutionContext {
  chord: Chord
  key: KeyContext
  progression: Chord[]
  index: number
}

/**
 * A pluggable chord-substitution strategy. `suggest` returns zero or more
 * candidate replacement chords, each carrying a `source` that explains why.
 * Adding a new kind of substitution = adding one of these to the registry.
 */
export interface SubstitutionStrategy {
  id: string
  label: string
  suggest(ctx: SubstitutionContext): Chord[]
}
