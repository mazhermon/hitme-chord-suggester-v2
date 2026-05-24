import {
  initialEditorState,
  editorReducer,
  displayChords,
  isResultsMode,
} from './editor'
import type { KeyContext } from '@/lib/theory/types'

const G_MAJOR: KeyContext = { tonic: 'G', mode: 'major' }

describe('editorReducer', () => {
  it('adds a diatonic chord and stays in input mode', () => {
    const s = editorReducer(initialEditorState, { type: 'addChord', degree: 0 })
    expect(s.userChords.map((c) => c.symbol)).toEqual(['Cmaj7'])
    expect(s.suggested).toBeNull()
    expect(isResultsMode(s)).toBe(false)
  })

  it('appends chords in order', () => {
    let s = editorReducer(initialEditorState, { type: 'addChord', degree: 0 })
    s = editorReducer(s, { type: 'addChord', degree: 3 })
    s = editorReducer(s, { type: 'addChord', degree: 4 })
    expect(s.userChords.map((c) => c.symbol)).toEqual(['Cmaj7', 'Fmaj7', 'G7'])
  })

  it('suggests substitutions and enters results mode', () => {
    let s = editorReducer(initialEditorState, { type: 'addChord', degree: 0 })
    s = editorReducer(s, { type: 'addChord', degree: 4 })
    s = editorReducer(s, { type: 'suggest', options: { homeBias: 1 } })
    expect(isResultsMode(s)).toBe(true)
    // homeBias 1 keeps everything diatonic
    expect(displayChords(s).map((c) => c.symbol)).toEqual(['Cmaj7', 'G7'])
  })

  it('returns to input mode when a chord is added after suggesting', () => {
    let s = editorReducer(initialEditorState, { type: 'addChord', degree: 0 })
    s = editorReducer(s, { type: 'suggest', options: { homeBias: 1 } })
    s = editorReducer(s, { type: 'addChord', degree: 1 })
    expect(s.suggested).toBeNull()
    expect(isResultsMode(s)).toBe(false)
  })

  it('removes a chord by index and clears suggestions', () => {
    let s = editorReducer(initialEditorState, { type: 'addChord', degree: 0 })
    s = editorReducer(s, { type: 'addChord', degree: 3 })
    s = editorReducer(s, { type: 'suggest', options: { homeBias: 1 } })
    s = editorReducer(s, { type: 'removeChordAt', index: 0 })
    expect(s.userChords.map((c) => c.symbol)).toEqual(['Fmaj7'])
    expect(s.suggested).toBeNull()
  })

  it('resets to an empty input progression', () => {
    let s = editorReducer(initialEditorState, { type: 'addChord', degree: 0 })
    s = editorReducer(s, { type: 'reset' })
    expect(s.userChords).toEqual([])
    expect(s.suggested).toBeNull()
  })

  it('re-realizes existing chords when the key changes', () => {
    let s = editorReducer(initialEditorState, { type: 'addChord', degree: 0 })
    s = editorReducer(s, { type: 'addChord', degree: 4 })
    s = editorReducer(s, { type: 'setKey', key: G_MAJOR })
    expect(s.key).toEqual(G_MAJOR)
    expect(s.userChords.map((c) => c.symbol)).toEqual(['Gmaj7', 'D7'])
  })

  it('toggles substitution strategies on and off', () => {
    const before = initialEditorState.enabledStrategies.length
    let s = editorReducer(initialEditorState, {
      type: 'toggleStrategy',
      id: 'tritone',
    })
    expect(s.enabledStrategies).not.toContain('tritone')
    expect(s.enabledStrategies).toHaveLength(before - 1)
    s = editorReducer(s, { type: 'toggleStrategy', id: 'tritone' })
    expect(s.enabledStrategies).toContain('tritone')
  })

  it('sets tempo and toggles mute', () => {
    let s = editorReducer(initialEditorState, { type: 'setBpm', bpm: 120 })
    expect(s.bpm).toBe(120)
    s = editorReducer(s, { type: 'toggleMute' })
    expect(s.muted).toBe(true)
  })

  it('loads a saved song into the editor', () => {
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
    expect(s.userChords.map((c) => c.symbol)).toEqual(['Gmaj7'])
    expect(s.suggested).toBeNull()
  })
})
