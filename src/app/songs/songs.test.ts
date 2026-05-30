import { nextCopyName } from './page'

describe('nextCopyName', () => {
  it('uses "<name> (copy)" when nothing is taken yet', () => {
    expect(nextCopyName('Foo', new Set())).toBe('Foo (copy)')
  })

  it('increments to (copy 2), (copy 3), ... when prior copies exist', () => {
    expect(nextCopyName('Foo', new Set(['Foo (copy)']))).toBe('Foo (copy 2)')
    expect(
      nextCopyName('Foo', new Set(['Foo (copy)', 'Foo (copy 2)'])),
    ).toBe('Foo (copy 3)')
  })

  it("doesn't trip on the base name being taken (it isn't checked, only its copies are)", () => {
    expect(nextCopyName('Foo', new Set(['Foo']))).toBe('Foo (copy)')
  })

  it('handles weird base names verbatim (no slug)', () => {
    expect(nextCopyName('My Song!', new Set())).toBe('My Song! (copy)')
  })
})
