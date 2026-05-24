import type { Chord, KeyContext } from '../types'
import type { SubstitutionStrategy } from './types'
import { modalInterchange } from './modal-interchange'
import { secondaryDominant } from './secondary-dominant'
import { tritoneSub } from './tritone'
import { diatonicThird } from './diatonic-third'
import { suspension } from './suspension'
import { planing } from './planing'

export type { SubstitutionStrategy, SubstitutionContext } from './types'

/** All available substitution strategies, in registry order. */
export const STRATEGIES: SubstitutionStrategy[] = [
  modalInterchange,
  secondaryDominant,
  tritoneSub,
  diatonicThird,
  suspension,
  planing,
]

export interface Candidate {
  strategyId: string
  chord: Chord
}

/** All substitution candidates for a single chord, from the enabled strategies. */
export function candidatesFor(
  chord: Chord,
  key: KeyContext,
  progression: Chord[],
  index: number,
  enabled: string[] = STRATEGIES.map((s) => s.id),
): Candidate[] {
  const active = STRATEGIES.filter((s) => enabled.includes(s.id))
  return active.flatMap((strategy) =>
    strategy
      .suggest({ chord, key, progression, index })
      .map((c) => ({ strategyId: strategy.id, chord: c })),
  )
}

/** Weighted-random choice among candidates (roll is a value in [0, 1)). */
export function pickCandidate(
  candidates: Candidate[],
  weights: Record<string, number>,
  roll: number,
): Chord | null {
  if (candidates.length === 0) return null
  const weighted = candidates.map((c) => ({
    chord: c.chord,
    w: weights[c.strategyId] ?? 1,
  }))
  const total = weighted.reduce((sum, c) => sum + c.w, 0)
  if (total <= 0) return null
  let r = roll * total
  for (const c of weighted) {
    r -= c.w
    if (r < 0) return c.chord
  }
  return weighted[weighted.length - 1].chord
}

export interface SuggestOptions {
  /** Strategy ids to use. Defaults to all registered strategies. */
  enabled?: string[]
  /** Relative weight per strategy id (default 1). Higher = chosen more often. */
  weights?: Record<string, number>
  /** Random source in [0, 1). Injectable for deterministic tests. */
  rng?: () => number
  /** Probability of leaving a chord diatonic, for gentle variety on re-roll. */
  homeBias?: number
}

const DEFAULT_HOME_BIAS = 0.34

/**
 * Substitute every chord in a progression (each independently), with a home-bias
 * roll for variety. Kept as a utility; the editor uses the slot-based suggest.
 */
export function suggestForProgression(
  progression: Chord[],
  key: KeyContext,
  options: SuggestOptions = {},
): Chord[] {
  const {
    enabled = STRATEGIES.map((s) => s.id),
    weights = {},
    rng = Math.random,
    homeBias = DEFAULT_HOME_BIAS,
  } = options

  return progression.map((chord, index) => {
    const candidates = candidatesFor(chord, key, progression, index, enabled)
    if (candidates.length === 0) return chord
    if (rng() < homeBias) return chord
    return pickCandidate(candidates, weights, rng()) ?? chord
  })
}
