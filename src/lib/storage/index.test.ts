import { isFirebaseConfigured, getStorage } from './index'

describe('storage selector', () => {
  it('reports Firebase as not configured when env vars are absent', () => {
    expect(isFirebaseConfigured()).toBe(false)
  })

  it('falls back to a usable local provider', async () => {
    const storage = getStorage()
    expect(typeof storage.list).toBe('function')
    expect(typeof storage.save).toBe('function')
    // With no backend (node, unconfigured), it resolves to an empty list.
    await expect(storage.list()).resolves.toEqual([])
  })
})
