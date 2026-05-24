import type { Chord, KeyContext } from '@/lib/theory/types'
import { realizeChord } from '@/lib/theory/chords'
import {
  STRATEGIES,
  suggestForProgression,
  type SuggestOptions,
} from '@/lib/theory/substitutions'

export interface EditorState {
  key: KeyContext
  /** The diatonic progression the user entered (by Nashville degree). */
  userChords: Chord[]
  /** Substitution results, or null while in input mode. */
  suggested: Chord[] | null
  /** Ids of the substitution strategies currently enabled. */
  enabledStrategies: string[]
  bpm: number
  muted: boolean
}

export const initialEditorState: EditorState = {
  key: { tonic: 'C', mode: 'major' },
  userChords: [],
  suggested: null,
  enabledStrategies: STRATEGIES.map((s) => s.id),
  bpm: 90,
  muted: false,
}

export type EditorAction =
  | { type: 'addChord'; degree: number }
  | { type: 'removeChordAt'; index: number }
  | { type: 'reset' }
  | { type: 'suggest'; options?: SuggestOptions }
  | { type: 'setKey'; key: KeyContext }
  | { type: 'toggleStrategy'; id: string }
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
          ...action.options,
        }),
      }

    case 'setKey':
      return {
        ...state,
        key: action.key,
        // Keep the same degrees, re-spelled into the new key.
        userChords: state.userChords.map((c) =>
          realizeChord(c.degree, action.key),
        ),
        suggested: null,
      }

    case 'toggleStrategy': {
      const enabled = state.enabledStrategies.includes(action.id)
        ? state.enabledStrategies.filter((id) => id !== action.id)
        : [...state.enabledStrategies, action.id]
      return { ...state, enabledStrategies: enabled }
    }

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
