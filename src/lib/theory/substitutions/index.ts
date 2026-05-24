import type { Chord, KeyContext } from '../types'
import type { SubstitutionStrategy } from './types'
import { modalInterchange } from './modal-interchange'
import { secondaryDominant } from './secondary-dominant'
import { tritoneSub } from './tritone'
import { diatonicThird } from './diatonic-third'

export type { SubstitutionStrategy, SubstitutionContext } from './types'

/** All available substitution strategies, in registry order. */
export const STRATEGIES: SubstitutionStrategy[] = [
  modalInterchange,
  secondaryDominant,
  tritoneSub,
  diatonicThird,
]

export interface SuggestOptions {
  /** Strategy ids to use. Defaults to all registered strategies. */
  enabled?: string[]
  /** Random source in [0, 1). Injectable for deterministic tests. */
  rng?: () => number
  /** Probability of leaving a chord diatonic, for gentle variety on re-roll. */
  homeBias?: number
}

const DEFAULT_HOME_BIAS = 0.34

/**
 * Suggest a substitution for each chord in a progression. Per position we gather
 * candidates from the enabled strategies and, unless a home-bias roll keeps the
 * chord diatonic (or no candidates exist), pick one at random. Re-running yields
 * fresh variations, like the legacy "Suggest" button.
 */
export function suggestForProgression(
  progression: Chord[],
  key: KeyContext,
  options: SuggestOptions = {},
): Chord[] {
  const {
    enabled = STRATEGIES.map((s) => s.id),
    rng = Math.random,
    homeBias = DEFAULT_HOME_BIAS,
  } = options

  const active = STRATEGIES.filter((s) => enabled.includes(s.id))

  return progression.map((chord, index) => {
    const candidates = active.flatMap((strategy) =>
      strategy.suggest({ chord, key, progression, index }),
    )
    if (candidates.length === 0) return chord
    if (rng() < homeBias) return chord
    const pick = Math.floor(rng() * candidates.length)
    return candidates[Math.min(pick, candidates.length - 1)]
  })
}
