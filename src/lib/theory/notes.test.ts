import { noteToMidi, midiToFreq, noteToFreq } from './notes'

describe('notes', () => {
  it('converts a note name to a MIDI number', () => {
    expect(noteToMidi('C4')).toBe(60)
    expect(noteToMidi('A4')).toBe(69)
  })

  it('returns null for an unparseable note', () => {
    expect(noteToMidi('not-a-note')).toBeNull()
  })

  it('converts a MIDI number to a frequency (A4 = 440Hz)', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5)
    expect(midiToFreq(60)).toBeCloseTo(261.626, 2)
  })

  it('converts a note name straight to a frequency', () => {
    expect(noteToFreq('A4')).toBeCloseTo(440, 5)
  })
})
