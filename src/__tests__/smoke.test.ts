// Trivial smoke test to confirm the Vitest + jsdom toolchain runs.
// Real tests for the theory engine arrive in Phase 3.
describe('toolchain smoke test', () => {
  it('runs vitest with globals', () => {
    expect(1 + 1).toBe(2)
  })

  it('has a jsdom document', () => {
    expect(typeof document).toBe('object')
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement)
  })
})
