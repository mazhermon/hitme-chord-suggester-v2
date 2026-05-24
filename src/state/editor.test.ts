import {
  initialEditorState,
  editorReducer,
  displayChords,
  isResultsMode,
  effectiveExtensions,
  type EditorState,
} from './editor'
import { STYLES } from '@/lib/theory/styles'
import type { KeyContext } from '@/lib/theory/types'

const G_MAJOR: KeyContext = { tonic: 'G', mode: 'major' }

function withChords(degrees: number[]): EditorState {
  return degrees.reduce(
    (s, degree) => editorReducer(s, { type: 'addChord', degree }),
    initialEditorState,
  )
}

describe('editorReducer — building a progression', () => {
  it('adds diatonic chords in order and stays in input mode', () => {
    const s = withChords([0, 3, 4])
    expect(displayChords(s).map((c) => c.symbol)).toEqual([
      'Cmaj7',
      'Fmaj7',
      'G7',
    ])
    expect(isResultsMode(s)).toBe(false)
  })

  it('removes a chord by index', () => {
    const s = editorReducer(withChords([0, 3]), {
      type: 'removeChordAt',
      index: 0,
    })
    expect(displayChords(s).map((c) => c.symbol)).toEqual(['Fmaj7'])
  })

  it('resets to empty', () => {
    expect(editorReducer(withChords([0]), { type: 'reset' }).slots).toEqual([])
  })
})

describe('editorReducer — suggest changes only 1–2 chords', () => {
  it('substitutes at most two unlocked slots, leaving the rest diatonic', () => {
    const s = editorReducer(withChords([0, 1, 4, 5]), { type: 'suggest' })
    const changed = s.slots.filter((slot) => slot.sub !== null).length
    expect(changed).toBeGreaterThanOrEqual(1)
    expect(changed).toBeLessThanOrEqual(2)
    expect(isResultsMode(s)).toBe(true)
  })

  it('never touches a locked slot', () => {
    let s = withChords([0, 1, 4, 5])
    s = editorReducer(s, { type: 'toggleLock', index: 0 })
    s = editorReducer(s, { type: 'toggleLock', index: 1 })
    // run several times to be sure the locked ones are never picked
    for (let n = 0; n < 25; n++) s = editorReducer(s, { type: 'suggest' })
    expect(s.slots[0].sub).toBeNull()
    expect(s.slots[1].sub).toBeNull()
  })
})

describe('editorReducer — per-chord control', () => {
  it('swaps just one chord, leaving the others diatonic', () => {
    const start = withChords([0, 1, 4])
    const s = editorReducer(start, {
      type: 'swapChord',
      index: 1,
      rng: () => 0,
    })
    expect(s.slots[1].sub).not.toBeNull()
    expect(s.slots[0].sub).toBeNull()
    expect(s.slots[2].sub).toBeNull()
  })

  it('does not swap a locked chord', () => {
    let s = withChords([0, 1])
    s = editorReducer(s, { type: 'toggleLock', index: 1 })
    s = editorReducer(s, { type: 'swapChord', index: 1, rng: () => 0 })
    expect(s.slots[1].sub).toBeNull()
  })

  it('reverts a swapped chord back to diatonic', () => {
    let s = editorReducer(withChords([0, 1]), {
      type: 'swapChord',
      index: 1,
      rng: () => 0,
    })
    s = editorReducer(s, { type: 'revertChord', index: 1 })
    expect(s.slots[1].sub).toBeNull()
  })

  it('toggles a lock on and off', () => {
    let s = editorReducer(withChords([0]), { type: 'toggleLock', index: 0 })
    expect(s.slots[0].locked).toBe(true)
    s = editorReducer(s, { type: 'toggleLock', index: 0 })
    expect(s.slots[0].locked).toBe(false)
  })
})

describe('editorReducer — settings', () => {
  it('re-realizes bases and clears subs when the key changes', () => {
    let s = editorReducer(withChords([0, 4]), {
      type: 'swapChord',
      index: 0,
      rng: () => 0,
    })
    s = editorReducer(s, { type: 'setKey', key: G_MAJOR })
    expect(s.key).toEqual(G_MAJOR)
    expect(displayChords(s).map((c) => c.symbol)).toEqual(['Gmaj7', 'D7'])
    expect(s.slots.every((slot) => slot.sub === null)).toBe(true)
  })

  it('applies a genre preset when the style changes', () => {
    const s = editorReducer(initialEditorState, {
      type: 'setStyle',
      style: 'folk',
    })
    expect(s.style).toBe('folk')
    expect(s.enabledStrategies).toContain('suspension')
    expect(s.extensions).toEqual({
      seventh: false,
      ninth: false,
      eleventh: false,
    })
    expect(s.envelope.attack).toBe(STYLES.folk.envelope.attack)
  })

  it('toggles each extension independently (9th without 7th)', () => {
    // jazz default = { seventh, ninth } on. Turn the 7th off, keep the 9th.
    const s = editorReducer(initialEditorState, {
      type: 'toggleExtension',
      ext: 'seventh',
    })
    expect(s.extensions).toEqual({
      seventh: false,
      ninth: true, // unchanged — no cascade
      eleventh: false,
    })
  })

  it('overrides extensions on a single chord, leaving others on the default', () => {
    let s = withChords([0, 4])
    s = editorReducer(s, {
      type: 'toggleChordExtension',
      index: 0,
      ext: 'seventh',
    })
    // chord 0 now has an override with the 7th flipped off (from the jazz default)
    expect(effectiveExtensions(s, 0).seventh).toBe(false)
    expect(effectiveExtensions(s, 0).ninth).toBe(true)
    // chord 1 still inherits the global default
    expect(s.slots[1].extensions).toBeUndefined()
    expect(effectiveExtensions(s, 1)).toEqual(s.extensions)
  })

  it('cycles the voicing of a single chord', () => {
    let s = withChords([0])
    s = editorReducer(s, { type: 'cycleVoicing', index: 0 })
    expect(displayChords(s)[0].voicing).toBe(1)
  })

  it('updates the envelope and tempo', () => {
    let s = editorReducer(initialEditorState, {
      type: 'setEnvelope',
      envelope: { attack: 0.5 },
    })
    expect(s.envelope.attack).toBe(0.5)
    s = editorReducer(s, { type: 'setBpm', bpm: 120 })
    expect(s.bpm).toBe(120)
  })

  it('loads a saved song', () => {
    const song = {
      key: G_MAJOR,
      chords: [
        {
          degree: 0,
          root: 'G',
          quality: 'maj7' as const,
          symbol: 'Gmaj7',
          source: 'diatonic',
        },
      ],
    }
    const s = editorReducer(initialEditorState, { type: 'loadSong', song })
    expect(s.key).toEqual(G_MAJOR)
    expect(displayChords(s).map((c) => c.symbol)).toEqual(['Gmaj7'])
  })

  it('restores saved extensions, per-chord overrides + locks (save round-trip)', () => {
    const triad = { seventh: false, ninth: false, eleventh: false }
    const add9 = { seventh: false, ninth: true, eleventh: false }
    const s = editorReducer(initialEditorState, {
      type: 'loadSong',
      song: {
        key: G_MAJOR,
        chords: [
          {
            degree: 0,
            root: 'G',
            quality: 'maj7' as const,
            symbol: 'Gmaj7',
            source: 'diatonic',
          },
        ],
        extensions: triad,
        chordExtensions: [add9],
        locked: [true],
      },
    })
    expect(s.extensions).toEqual(triad) // global default
    expect(effectiveExtensions(s, 0)).toEqual(add9) // per-chord override
    expect(s.slots[0].locked).toBe(true)
  })

  it('keeps the current default for legacy songs with no saved extensions', () => {
    const s = editorReducer(initialEditorState, {
      type: 'loadSong',
      song: {
        key: G_MAJOR,
        chords: [
          {
            degree: 0,
            root: 'G',
            quality: 'maj7' as const,
            symbol: 'Gmaj7',
            source: 'diatonic',
          },
        ],
      },
    })
    // legacy data has no extensions — adopt the editor's current default so re-saving heals it
    expect(effectiveExtensions(s, 0)).toEqual(initialEditorState.extensions)
  })

  it('defaults to a 9th (jazz preset) with the 7th on', () => {
    expect(initialEditorState.extensions).toEqual({
      seventh: true,
      ninth: true,
      eleventh: false,
    })
  })
})
