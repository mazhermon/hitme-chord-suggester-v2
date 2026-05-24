import { STYLES, STYLE_LIST, type StyleId } from './styles'
import { STRATEGIES } from './substitutions'

const validIds = new Set(STRATEGIES.map((s) => s.id))

describe('styles', () => {
  it('defines the four genres', () => {
    expect(STYLE_LIST.map((s) => s.id)).toEqual([
      'jazz',
      'folk',
      'pop',
      'house',
    ] satisfies StyleId[])
  })

  it('only references real substitution strategies', () => {
    for (const style of STYLE_LIST) {
      for (const id of style.enabledStrategies) {
        expect(validIds.has(id)).toBe(true)
      }
    }
  })

  it('makes jazz favour functional subs (tritone + secondary dominant)', () => {
    const jazz = STYLES.jazz
    expect(jazz.enabledStrategies).toContain('tritone')
    expect(jazz.weights['tritone']).toBeGreaterThan(
      jazz.weights['modal-interchange'] ?? 1,
    )
    expect(jazz.extensionLevel).toBe('ninth')
  })

  it('makes folk suspension-forward and triadic', () => {
    expect(STYLES.folk.enabledStrategies).toContain('suspension')
    expect(STYLES.folk.extensionLevel).toBe('triad')
  })

  it('makes house modal and extended (rich minor colour)', () => {
    expect(STYLES.house.enabledStrategies).toContain('modal-interchange')
    expect(['ninth', 'eleventh']).toContain(STYLES.house.extensionLevel)
  })

  it('bundles an envelope per style', () => {
    for (const style of STYLE_LIST) {
      expect(style.envelope.attack).toBeGreaterThanOrEqual(0)
      expect(style.envelope.release).toBeGreaterThan(0)
    }
  })
})
