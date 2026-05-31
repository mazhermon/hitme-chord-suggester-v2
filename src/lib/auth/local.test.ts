import { createLocalAuthAdapter } from './local'
import { AuthError } from './types'

beforeEach(() => {
  // Each test starts with a clean local user.
  localStorage.clear()
})

describe('LocalAuthAdapter — status', () => {
  it("starts signed-out when there's no persisted user", () => {
    const auth = createLocalAuthAdapter()
    expect(auth.status()).toEqual({ state: 'signedOut' })
  })

  it('reports the persisted anonymous user across instances', async () => {
    const a = createLocalAuthAdapter()
    const user = await a.signInAnonymously()
    expect(user.isAnonymous).toBe(true)
    expect(user.id).toBeTruthy()

    // A fresh instance reads the same record back.
    const b = createLocalAuthAdapter()
    expect(b.status()).toMatchObject({
      state: 'anonymous',
      user: { id: user.id, isAnonymous: true },
    })
  })

  it('signInAnonymously is idempotent', async () => {
    const auth = createLocalAuthAdapter()
    const first = await auth.signInAnonymously()
    const second = await auth.signInAnonymously()
    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
  })
})

describe('LocalAuthAdapter — onChange', () => {
  it('fires the listener immediately with the current state', () => {
    const auth = createLocalAuthAdapter()
    const calls: unknown[] = []
    auth.onChange((s) => calls.push(s))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ state: 'signedOut' })
  })

  it('fires on signInAnonymously and signOut transitions', async () => {
    const auth = createLocalAuthAdapter()
    const calls: unknown[] = []
    auth.onChange((s) => calls.push(s))
    await auth.signInAnonymously()
    await auth.signOut()
    expect(calls.length).toBeGreaterThanOrEqual(3) // initial + signedIn + signedOut
    expect(calls[calls.length - 1]).toEqual({ state: 'signedOut' })
  })
})

describe('LocalAuthAdapter — account methods all throw not-supported', () => {
  const auth = createLocalAuthAdapter()
  const cases: Array<[string, () => Promise<unknown>]> = [
    ['sendMagicLink', () => auth.sendMagicLink('a@b.c', 'https://localhost/callback')],
    ['completeMagicLink', () => auth.completeMagicLink('https://localhost')],
    ['signUpWithPassword', () => auth.signUpWithPassword('a@b.c', 'pw1234567890')],
    ['signInWithPassword', () => auth.signInWithPassword('a@b.c', 'pw1234567890')],
    ['sendPasswordReset', () => auth.sendPasswordReset('a@b.c', 'https://localhost')],
    ['deleteAccount', () => auth.deleteAccount()],
  ]
  for (const [name, run] of cases) {
    it(`${name} → AuthError(not-supported)`, async () => {
      await expect(run()).rejects.toBeInstanceOf(AuthError)
      try {
        await run()
      } catch (e) {
        expect((e as AuthError).code).toBe('not-supported')
      }
    })
  }
})
