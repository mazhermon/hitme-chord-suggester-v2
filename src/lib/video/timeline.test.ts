import { chordTimeline, activeIndexAt } from './timeline'

describe('chordTimeline', () => {
  it('places chords back-to-back at the playback tempo', () => {
    // (60 / 120) * 2 beats = 1.0s per chord
    const { slots, duration } = chordTimeline(3, { bpm: 120, beatsPerChord: 2 })
    expect(slots).toEqual([
      { index: 0, start: 0, end: 1 },
      { index: 1, start: 1, end: 2 },
      { index: 2, start: 2, end: 3 },
    ])
    expect(duration).toBe(3)
  })

  it('defaults to the same tempo as playProgression (90bpm, 2 beats)', () => {
    const { slots, duration } = chordTimeline(2)
    const per = (60 / 90) * 2 // 1.3333…
    expect(slots[1].start).toBeCloseTo(per)
    expect(duration).toBeCloseTo(2 * per)
  })

  it('returns an empty timeline for no chords', () => {
    expect(chordTimeline(0)).toEqual({ slots: [], duration: 0 })
  })
})

describe('activeIndexAt', () => {
  const { slots } = chordTimeline(3, { bpm: 120, beatsPerChord: 2 }) // 1s each

  it('finds the chord sounding at a time (start inclusive)', () => {
    expect(activeIndexAt(slots, 0)).toBe(0)
    expect(activeIndexAt(slots, 0.5)).toBe(0)
    expect(activeIndexAt(slots, 1)).toBe(1)
    expect(activeIndexAt(slots, 2.5)).toBe(2)
  })

  it('clamps before the start and after the end', () => {
    expect(activeIndexAt(slots, -1)).toBe(0)
    expect(activeIndexAt(slots, 99)).toBe(2)
  })

  it('returns -1 for an empty timeline', () => {
    expect(activeIndexAt([], 1)).toBe(-1)
  })
})
