import { progressionToMidi } from './export'
import { realizeChord } from '../theory/chords'
import type { KeyContext } from '../theory/types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }
const progression = [0, 3, 4].map((d) => realizeChord(d, cMajor)) // Cmaj7 Fmaj7 G7

function header(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes.slice(0, 4))
}

describe('progressionToMidi', () => {
  it('produces a Standard MIDI File (MThd header)', () => {
    const bytes = progressionToMidi(progression, {})
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(header(bytes)).toBe('MThd')
    expect(bytes.length).toBeGreaterThan(20)
  })

  it('grows with more chords (each chord adds note events)', () => {
    const one = progressionToMidi(progression.slice(0, 1), {})
    const three = progressionToMidi(progression, {})
    expect(three.length).toBeGreaterThan(one.length)
  })

  it('still returns a valid file for an empty progression', () => {
    const bytes = progressionToMidi([], {})
    expect(header(bytes)).toBe('MThd')
  })
})
