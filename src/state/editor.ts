import type { Chord, KeyContext } from '@/lib/theory/types'
import { realizeChord } from '@/lib/theory/chords'
import { candidatesFor, pickCandidate } from '@/lib/theory/substitutions'
import { STYLES, type Style, type StyleId } from '@/lib/theory/styles'
import {
  flagsFromLevel,
  type ExtensionFlags,
  type Extension,
} from '@/lib/theory/extensions'
import { type EnvelopeSettings } from '@/lib/audio/envelope'

export type { Extension } from '@/lib/theory/extensions'

/**
 * One position in the progression: its diatonic chord, an optional swap, a lock,
 * and an optional per-chord extension override (falls back to the global default).
 */
export interface ChordSlot {
  base: Chord
  sub: Chord | null
  locked: boolean
  extensions?: ExtensionFlags
}

export interface EditorState {
  key: KeyContext
  /** Name of the loaded song, or null while it's an unsaved progression. */
  name: string | null
  slots: ChordSlot[]
  style: StyleId
  enabledStrategies: string[]
  weights: Record<string, number>
  extensions: ExtensionFlags
  envelope: EnvelopeSettings
  bpm: number
  /** Playback octave offset (whole octaves, clamped to ±2). */
  octave: number
  muted: boolean
  showGuitar: boolean
  showPiano: boolean
}

const MAX_OCTAVE_SHIFT = 2

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
  name: null,
  slots: [],
  bpm: 90,
  octave: 0,
  muted: false,
  showGuitar: false,
  showPiano: false,
  ...applyStyle(STYLES.jazz),
}

/** Max chords changed by a single "Suggest". */
const MAX_SUBSTITUTIONS = 2

export type EditorAction =
  | { type: 'addChord'; degree: number }
  | { type: 'removeChordAt'; index: number }
  | { type: 'reset' }
  | { type: 'suggest'; rng?: () => number; max?: number }
  | { type: 'swapChord'; index: number; rng?: () => number }
  | { type: 'revertChord'; index: number }
  | { type: 'toggleLock'; index: number }
  | { type: 'setKey'; key: KeyContext }
  | { type: 'setStyle'; style: StyleId }
  | { type: 'toggleStrategy'; id: string }
  | { type: 'toggleExtension'; ext: Extension }
  | { type: 'toggleChordExtension'; index: number; ext: Extension }
  | { type: 'cycleVoicing'; index: number }
  | { type: 'setEnvelope'; envelope: Partial<EnvelopeSettings> }
  | { type: 'setBpm'; bpm: number }
  | { type: 'setOctave'; octave: number }
  | { type: 'toggleMute' }
  | { type: 'toggleGuitar' }
  | { type: 'togglePiano' }
  | {
      type: 'loadSong'
      song: {
        name?: string
        key: KeyContext
        chords: Chord[]
        extensions?: ExtensionFlags
        chordExtensions?: ExtensionFlags[]
        locked?: boolean[]
        envelope?: EnvelopeSettings
        bpm?: number
        octave?: number
        style?: StyleId
      }
    }

function shown(slot: ChordSlot): Chord {
  return slot.sub ?? slot.base
}

function pickDistinct<T>(items: T[], count: number, rng: () => number): T[] {
  const pool = [...items]
  const out: T[] = []
  while (out.length < count && pool.length > 0) {
    const i = Math.min(Math.floor(rng() * pool.length), pool.length - 1)
    out.push(pool.splice(i, 1)[0])
  }
  return out
}

/** Re-roll: keep locked slots, reset the rest to diatonic, then substitute 1–2. */
function suggestSlots(
  state: EditorState,
  rng: () => number,
  max: number,
): ChordSlot[] {
  const { key, enabledStrategies, weights } = state
  const cleared = state.slots.map((s) => (s.locked ? s : { ...s, sub: null }))
  const prog = cleared.map(shown)

  const eligible: number[] = []
  cleared.forEach((slot, i) => {
    if (slot.locked) return
    if (candidatesFor(slot.base, key, prog, i, enabledStrategies).length > 0) {
      eligible.push(i)
    }
  })
  if (eligible.length === 0) return cleared

  const desired = rng() < 0.45 ? 1 : 2
  const count = Math.min(desired, max, eligible.length)
  const chosen = pickDistinct(eligible, Math.max(1, count), rng)

  const next = [...cleared]
  for (const i of chosen) {
    const cands = candidatesFor(next[i].base, key, prog, i, enabledStrategies)
    const sub = pickCandidate(cands, weights, rng())
    if (sub) next[i] = { ...next[i], sub }
  }
  return next
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'addChord':
      return {
        ...state,
        slots: [
          ...state.slots,
          {
            base: realizeChord(action.degree, state.key),
            sub: null,
            locked: false,
          },
        ],
      }

    case 'removeChordAt':
      return {
        ...state,
        slots: state.slots.filter((_, i) => i !== action.index),
      }

    case 'reset':
      return { ...state, slots: [], name: null }

    case 'suggest':
      return {
        ...state,
        slots: suggestSlots(
          state,
          action.rng ?? Math.random,
          action.max ?? MAX_SUBSTITUTIONS,
        ),
      }

    case 'swapChord': {
      const slot = state.slots[action.index]
      if (!slot || slot.locked) return state
      const prog = state.slots.map(shown)
      const cands = candidatesFor(
        slot.base,
        state.key,
        prog,
        action.index,
        state.enabledStrategies,
      )
      const sub = pickCandidate(
        cands,
        state.weights,
        (action.rng ?? Math.random)(),
      )
      if (!sub) return state
      return {
        ...state,
        slots: state.slots.map((s, i) =>
          i === action.index ? { ...s, sub } : s,
        ),
      }
    }

    case 'revertChord':
      return {
        ...state,
        slots: state.slots.map((s, i) =>
          i === action.index && !s.locked ? { ...s, sub: null } : s,
        ),
      }

    case 'toggleLock':
      return {
        ...state,
        slots: state.slots.map((s, i) =>
          i === action.index ? { ...s, locked: !s.locked } : s,
        ),
      }

    case 'setKey':
      return {
        ...state,
        key: action.key,
        // Re-spell the diatonic bases into the new key; subs no longer apply.
        slots: state.slots.map((s) => ({
          base: realizeChord(s.base.degree, action.key),
          sub: null,
          locked: s.locked,
          extensions: s.extensions,
        })),
      }

    case 'setStyle':
      return { ...state, ...applyStyle(STYLES[action.style]) }

    case 'toggleStrategy': {
      const enabled = state.enabledStrategies.includes(action.id)
        ? state.enabledStrategies.filter((id) => id !== action.id)
        : [...state.enabledStrategies, action.id]
      return { ...state, enabledStrategies: enabled }
    }

    case 'toggleExtension':
      // Independent — toggling one extension does not pull in the others.
      return {
        ...state,
        extensions: {
          ...state.extensions,
          [action.ext]: !state.extensions[action.ext],
        },
      }

    case 'toggleChordExtension':
      return {
        ...state,
        slots: state.slots.map((s, i) => {
          if (i !== action.index) return s
          const current = s.extensions ?? state.extensions
          return {
            ...s,
            extensions: { ...current, [action.ext]: !current[action.ext] },
          }
        }),
      }

    case 'cycleVoicing': {
      return {
        ...state,
        slots: state.slots.map((s, i) => {
          if (i !== action.index) return s
          const target = s.sub ?? s.base
          const voiced = { ...target, voicing: (target.voicing ?? 0) + 1 }
          return s.sub ? { ...s, sub: voiced } : { ...s, base: voiced }
        }),
      }
    }

    case 'setEnvelope':
      return { ...state, envelope: { ...state.envelope, ...action.envelope } }

    case 'setBpm':
      return { ...state, bpm: action.bpm }

    case 'setOctave':
      return {
        ...state,
        octave: Math.max(
          -MAX_OCTAVE_SHIFT,
          Math.min(MAX_OCTAVE_SHIFT, Math.round(action.octave)),
        ),
      }

    case 'toggleMute':
      return { ...state, muted: !state.muted }

    case 'toggleGuitar':
      return { ...state, showGuitar: !state.showGuitar }

    case 'togglePiano':
      return { ...state, showPiano: !state.showPiano }

    case 'loadSong': {
      const s = action.song
      // Apply the saved style first (it sets defaults for envelope/strategies/
      // extensions); then explicitly override with any settings the user
      // customized on top of that style at save time. Without a saved style
      // we keep the editor's current style untouched and only override the
      // fields that were saved explicitly.
      const stylePatch: Partial<ReturnType<typeof applyStyle>> = s.style
        ? applyStyle(STYLES[s.style])
        : {}
      return {
        ...state,
        ...stylePatch,
        key: s.key,
        name: s.name ?? null,
        extensions: s.extensions ?? stylePatch.extensions ?? state.extensions,
        envelope: s.envelope ?? stylePatch.envelope ?? state.envelope,
        bpm: s.bpm ?? state.bpm,
        octave: typeof s.octave === 'number' ? s.octave : state.octave,
        slots: s.chords.map((c, i) => ({
          base: c,
          sub: null,
          locked: s.locked?.[i] ?? false,
          extensions: s.chordExtensions?.[i],
        })),
      }
    }

    default:
      return state
  }
}

/** Chords currently on screen (a swap if present, else the diatonic base). */
export function displayChords(state: EditorState): Chord[] {
  return state.slots.map(shown)
}

/** True when at least one chord has been substituted (the "dark" canvas state). */
export function isResultsMode(state: EditorState): boolean {
  return state.slots.some((s) => s.sub !== null)
}

/** The effective extension flags for a chord: its override, else the global default. */
export function effectiveExtensions(
  state: EditorState,
  index: number,
): ExtensionFlags {
  return state.slots[index]?.extensions ?? state.extensions
}

/** Effective extension flags for every chord, aligned to displayChords(). */
export function allExtensions(state: EditorState): ExtensionFlags[] {
  return state.slots.map((s) => s.extensions ?? state.extensions)
}
