import type { Chord, KeyContext } from '@/lib/theory/types'
import { realizeChord } from '@/lib/theory/chords'
import {
  suggestForProgression,
  type SuggestOptions,
} from '@/lib/theory/substitutions'
import { STYLES, type Style, type StyleId } from '@/lib/theory/styles'
import {
  flagsFromLevel,
  levelFromFlags,
  type ExtensionFlags,
  type ExtensionLevel,
} from '@/lib/theory/extensions'
import { type EnvelopeSettings } from '@/lib/audio/envelope'

export type Extension = keyof ExtensionFlags

export interface EditorState {
  key: KeyContext
  /** The diatonic progression the user entered (by Nashville degree). */
  userChords: Chord[]
  /** Substitution results, or null while in input mode. */
  suggested: Chord[] | null
  /** Active genre preset. */
  style: StyleId
  enabledStrategies: string[]
  weights: Record<string, number>
  extensions: ExtensionFlags
  envelope: EnvelopeSettings
  bpm: number
  muted: boolean
}

/** Derive the harmony/sound config that a style preset implies. */
function applyStyle(style: Style) {
  return {
    style: style.id,
    enabledStrategies: [...style.enabledStrategies],
    weights: { ...style.weights },
    extensions: flagsFromLevel(style.extensionLevel),
    envelope: { ...style.envelope },
  }
}

export const initialEditorState: EditorState = {
  key: { tonic: 'C', mode: 'major' },
  userChords: [],
  suggested: null,
  bpm: 90,
  muted: false,
  ...applyStyle(STYLES.jazz),
}

export type EditorAction =
  | { type: 'addChord'; degree: number }
  | { type: 'removeChordAt'; index: number }
  | { type: 'reset' }
  | { type: 'suggest'; options?: SuggestOptions }
  | { type: 'setKey'; key: KeyContext }
  | { type: 'setStyle'; style: StyleId }
  | { type: 'toggleStrategy'; id: string }
  | { type: 'toggleExtension'; ext: Extension }
  | { type: 'cycleVoicing'; index: number }
  | { type: 'setEnvelope'; envelope: Partial<EnvelopeSettings> }
  | { type: 'setBpm'; bpm: number }
  | { type: 'toggleMute' }
  | { type: 'loadSong'; song: { key: KeyContext; chords: Chord[] } }

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'addChord':
      return {
        ...state,
        userChords: [
          ...state.userChords,
          realizeChord(action.degree, state.key),
        ],
        suggested: null,
      }

    case 'removeChordAt':
      return {
        ...state,
        userChords: state.userChords.filter((_, i) => i !== action.index),
        suggested: null,
      }

    case 'reset':
      return { ...state, userChords: [], suggested: null }

    case 'suggest':
      return {
        ...state,
        suggested: suggestForProgression(state.userChords, state.key, {
          enabled: state.enabledStrategies,
          weights: state.weights,
          ...action.options,
        }),
      }

    case 'setKey':
      return {
        ...state,
        key: action.key,
        userChords: state.userChords.map((c) =>
          realizeChord(c.degree, action.key),
        ),
        suggested: null,
      }

    case 'setStyle':
      return { ...state, ...applyStyle(STYLES[action.style]) }

    case 'toggleStrategy': {
      const enabled = state.enabledStrategies.includes(action.id)
        ? state.enabledStrategies.filter((id) => id !== action.id)
        : [...state.enabledStrategies, action.id]
      return { ...state, enabledStrategies: enabled }
    }

    case 'toggleExtension': {
      const f = { ...state.extensions }
      const turningOn = !f[action.ext]
      f[action.ext] = turningOn
      if (turningOn) {
        if (action.ext === 'eleventh') f.ninth = true
        if (action.ext === 'eleventh' || action.ext === 'ninth')
          f.seventh = true
      } else {
        if (action.ext === 'seventh') {
          f.ninth = false
          f.eleventh = false
        }
        if (action.ext === 'ninth') f.eleventh = false
      }
      return { ...state, extensions: f }
    }

    case 'cycleVoicing': {
      const bump = (chords: Chord[]) =>
        chords.map((c, i) =>
          i === action.index ? { ...c, voicing: (c.voicing ?? 0) + 1 } : c,
        )
      return state.suggested
        ? { ...state, suggested: bump(state.suggested) }
        : { ...state, userChords: bump(state.userChords) }
    }

    case 'setEnvelope':
      return { ...state, envelope: { ...state.envelope, ...action.envelope } }

    case 'setBpm':
      return { ...state, bpm: action.bpm }

    case 'toggleMute':
      return { ...state, muted: !state.muted }

    case 'loadSong':
      return {
        ...state,
        key: action.song.key,
        userChords: action.song.chords,
        suggested: null,
      }

    default:
      return state
  }
}

/** Chords currently on screen: suggestions if present, else the user's input. */
export function displayChords(state: EditorState): Chord[] {
  return state.suggested ?? state.userChords
}

/** True when showing suggestion results (the "dark" canvas state). */
export function isResultsMode(state: EditorState): boolean {
  return state.suggested !== null
}

/** The current extension level derived from the cumulative flags. */
export function extensionLevel(state: EditorState): ExtensionLevel {
  return levelFromFlags(state.extensions)
}
