import { findGuitarShape, STANDARD_TUNING } from './voicing'
import { Note } from 'tonal'

// chroma of the note sounding on a string at a given fret
function chromaAt(stringIndex: number, fret: number): number {
  return (STANDARD_TUNING[stringIndex] + fret) % 12
}

describe('findGuitarShape', () => {
  it('voices C major with chord tones only and the root in the bass', () => {
    const shape = findGuitarShape({ root: 'C', quality: 'maj' })
    const tones = new Set([0, 4, 7]) // C E G
    const sounding = shape.frets
      .map((f, i) => ({ f, i }))
      .filter((s) => s.f !== null) as { f: number; i: number }[]

    expect(sounding.length).toBeGreaterThanOrEqual(3)
    // every sounding string is a chord tone
    for (const s of sounding) expect(tones.has(chromaAt(s.i, s.f))).toBe(true)
    // the root (C = chroma 0) is present
    expect(sounding.some((s) => chromaAt(s.i, s.f) === 0)).toBe(true)
    // lowest sounding string is the root
    expect(chromaAt(sounding[0].i, sounding[0].f)).toBe(0)
  })

  it('voices a minor 7th with only its chord tones', () => {
    const shape = findGuitarShape({ root: 'A', quality: 'min7' })
    const tones = new Set([9, 0, 4, 7]) // A C E G
    const sounding = shape.frets
      .map((f, i) => ({ f, i }))
      .filter((s) => s.f !== null) as { f: number; i: number }[]
    expect(sounding.length).toBeGreaterThanOrEqual(4)
    for (const s of sounding) expect(tones.has(chromaAt(s.i, s.f))).toBe(true)
  })

  it('reports a base fret and keeps the fretted span playable (≤ 4)', () => {
    const shape = findGuitarShape({ root: 'Eb', quality: 'maj7' })
    expect(shape.baseFret).toBeGreaterThanOrEqual(1)
    const fretted = shape.frets.filter((f): f is number => !!f && f > 0)
    if (fretted.length > 1) {
      expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(4)
    }
  })

  it('uses six strings in standard EADGBE tuning', () => {
    expect(STANDARD_TUNING).toHaveLength(6)
    expect(STANDARD_TUNING[0]).toBe(Note.midi('E2'))
    expect(STANDARD_TUNING[5]).toBe(Note.midi('E4'))
  })
})
