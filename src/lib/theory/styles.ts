import type { ExtensionLevel } from './extensions'
import type { EnvelopeSettings } from '../audio/envelope'

export type StyleId = 'jazz' | 'folk' | 'pop' | 'house'

/**
 * A genre preset. Picking a style reconfigures the suggestion behaviour
 * (which substitutions fire and how strongly), the default chord extension
 * level, and the synth envelope — so "Suggest" feels idiomatic to the genre.
 */
export interface Style {
  id: StyleId
  label: string
  description: string
  /** Substitution strategy ids this style turns on. */
  enabledStrategies: string[]
  /** Relative weight per strategy id (higher = chosen more often). */
  weights: Record<string, number>
  extensionLevel: ExtensionLevel
  envelope: EnvelopeSettings
}

export const STYLES: Record<StyleId, Style> = {
  // Functional reharmonization: tritone subs, secondary dominants, rich 9ths.
  jazz: {
    id: 'jazz',
    label: 'Jazz',
    description: 'Tritone subs, secondary dominants, lush 9ths.',
    enabledStrategies: [
      'modal-interchange',
      'secondary-dominant',
      'tritone',
      'diatonic-third',
    ],
    weights: {
      tritone: 3,
      'secondary-dominant': 3,
      'modal-interchange': 1,
      'diatonic-third': 1,
    },
    extensionLevel: 'ninth',
    envelope: {
      attack: 0.01,
      decay: 0.18,
      sustain: 0.55,
      release: 0.5,
      waveform: 'triangle',
    },
  },

  // Open and modal: sus2/sus4, mixolydian/dorian colour, mostly triads.
  folk: {
    id: 'folk',
    label: 'Folk',
    description: 'Open sus chords, modal colour, plain triads.',
    enabledStrategies: ['suspension', 'modal-interchange', 'diatonic-third'],
    weights: {
      suspension: 3,
      'modal-interchange': 2,
      'diatonic-third': 1,
    },
    extensionLevel: 'triad',
    envelope: {
      attack: 0.004,
      decay: 0.12,
      sustain: 0.25,
      release: 0.25,
      waveform: 'triangle',
    },
  },

  // Borrowed chords from the parallel minor + secondary dominants, triadic.
  pop: {
    id: 'pop',
    label: 'Pop',
    description: 'Borrowed chords, secondary dominants, bright triads.',
    enabledStrategies: [
      'modal-interchange',
      'secondary-dominant',
      'diatonic-third',
      'suspension',
    ],
    weights: {
      'modal-interchange': 2,
      'secondary-dominant': 2,
      'diatonic-third': 2,
      suspension: 1,
    },
    extensionLevel: 'triad',
    envelope: {
      attack: 0.008,
      decay: 0.1,
      sustain: 0.6,
      release: 0.3,
      waveform: 'sawtooth',
    },
  },

  // Modal/minor with extended pads: min9/min11, Dorian–Aeolian colour.
  house: {
    id: 'house',
    label: 'House',
    description: 'Modal minor pads, planed stabs, lush 9ths, long release.',
    enabledStrategies: [
      'modal-interchange',
      'planing',
      'diatonic-third',
      'suspension',
    ],
    weights: {
      'modal-interchange': 3,
      planing: 3,
      'diatonic-third': 1,
      suspension: 1,
    },
    extensionLevel: 'ninth',
    envelope: {
      attack: 0.08,
      decay: 0.2,
      sustain: 0.8,
      release: 0.8,
      waveform: 'sine',
    },
  },
}

export const STYLE_LIST: Style[] = [
  STYLES.jazz,
  STYLES.folk,
  STYLES.pop,
  STYLES.house,
]
