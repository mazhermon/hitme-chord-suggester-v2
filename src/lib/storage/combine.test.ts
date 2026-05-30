import { joinSongs, splitSong, nextAvailableName } from './combine'
import type { Song } from './types'
import type { Chord } from '../theory/types'

function chord(root: string, degree = 0): Chord {
  return { degree, root, quality: 'maj7', symbol: `${root}maj7`, source: 'diatonic' }
}

function song(over: Partial<Song> = {}): Song {
  return {
    id: 'Test',
    name: 'Test',
    key: { tonic: 'C', mode: 'major' },
    chords: [chord('C'), chord('F'), chord('G'), chord('A')],
    createdAt: 1000,
    ...over,
  }
}

describe('joinSongs', () => {
  it('concatenates chords from both songs in order', () => {
    const a = song({ id: 'A', name: 'A', chords: [chord('C'), chord('F')] })
    const b = song({ id: 'B', name: 'B', chords: [chord('G'), chord('A')] })
    const joined = joinSongs(a, b, 'A + B', 5000)
    expect(joined.chords.map((c) => c.root)).toEqual(['C', 'F', 'G', 'A'])
    expect(joined.id).toBe('A + B')
    expect(joined.name).toBe('A + B')
    expect(joined.createdAt).toBe(5000)
  })

  it("keeps a's key + audio settings (b's are dropped)", () => {
    const a = song({
      key: { tonic: 'C', mode: 'major' },
      bpm: 90,
      octave: 0,
    })
    const b = song({
      key: { tonic: 'G', mode: 'minor' },
      bpm: 160,
      octave: 2,
    })
    const joined = joinSongs(a, b, 'AB', 1)
    expect(joined.key).toEqual({ tonic: 'C', mode: 'major' })
    expect(joined.bpm).toBe(90)
    expect(joined.octave).toBe(0)
  })

  it('preserves locked flags from both halves', () => {
    const a = song({ chords: [chord('C'), chord('F')], locked: [true, false] })
    const b = song({ chords: [chord('G')], locked: [true] })
    const joined = joinSongs(a, b, 'X', 1)
    expect(joined.locked).toEqual([true, false, true])
  })
})

describe('splitSong', () => {
  it('splits an even-length song into two named (1) and (2)', () => {
    const s = song({
      name: 'Foo',
      chords: [chord('C'), chord('F'), chord('G'), chord('A')],
    })
    const [a, b] = splitSong(s, 5000)
    expect(a.name).toBe('Foo (1)')
    expect(b.name).toBe('Foo (2)')
    expect(a.chords.map((c) => c.root)).toEqual(['C', 'F'])
    expect(b.chords.map((c) => c.root)).toEqual(['G', 'A'])
    expect(a.createdAt).toBe(5000)
  })

  it('carries locked flags into the correct half', () => {
    const s = song({
      chords: [chord('C'), chord('F'), chord('G'), chord('A')],
      locked: [true, false, false, true],
    })
    const [a, b] = splitSong(s, 1)
    expect(a.locked).toEqual([true, false])
    expect(b.locked).toEqual([false, true])
  })

  it('throws on odd chord counts (UI must hide Split when ineligible)', () => {
    const s = song({ chords: [chord('C'), chord('F'), chord('G')] })
    expect(() => splitSong(s, 1)).toThrow()
  })

  it('throws on empty songs', () => {
    const s = song({ chords: [] })
    expect(() => splitSong(s, 1)).toThrow()
  })
})

describe('nextAvailableName', () => {
  it('returns the desired name when nothing is taken', () => {
    expect(nextAvailableName('Foo', new Set())).toBe('Foo')
  })

  it('increments with (2), (3) when taken', () => {
    expect(nextAvailableName('Foo', new Set(['Foo']))).toBe('Foo (2)')
    expect(nextAvailableName('Foo', new Set(['Foo', 'Foo (2)']))).toBe('Foo (3)')
  })
})
