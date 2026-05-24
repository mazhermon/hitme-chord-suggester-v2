import { lessonForSource, LESSONS } from './lessons'

describe('lessonForSource', () => {
  it('maps each provenance label to the right concept', () => {
    expect(lessonForSource('diatonic')?.id).toBe('diatonic')
    expect(lessonForSource('from C dorian')?.id).toBe('modal-interchange')
    expect(lessonForSource('V/ii')?.id).toBe('secondary-dominant')
    expect(lessonForSource('tritone sub')?.id).toBe('tritone')
    expect(lessonForSource('sus2')?.id).toBe('suspension')
    expect(lessonForSource('planed ↑M2')?.id).toBe('planing')
  })

  it('distinguishes "diatonic 3rd" from plain "diatonic"', () => {
    expect(lessonForSource('diatonic 3rd (vi)')?.id).toBe('diatonic-third')
  })

  it('returns null for an unknown label', () => {
    expect(lessonForSource('mystery')).toBeNull()
  })

  it('every lesson has a title and body', () => {
    for (const lesson of Object.values(LESSONS)) {
      expect(lesson.title.length).toBeGreaterThan(0)
      expect(lesson.body.length).toBeGreaterThan(40)
    }
  })
})
