import { track } from './analytics'

type WindowWithVa = { va?: unknown }

describe('track', () => {
  afterEach(() => {
    delete (window as WindowWithVa).va
  })

  it('forwards events to the analytics queue when a provider is present', () => {
    const va = vi.fn()
    ;(window as WindowWithVa).va = va
    track('share_intent', { platform: 'TikTok' })
    expect(va).toHaveBeenCalledWith('event', {
      name: 'share_intent',
      platform: 'TikTok',
    })
  })

  it('no-ops safely when no analytics provider is present', () => {
    delete (window as WindowWithVa).va
    expect(() => track('share_intent', { platform: 'TikTok' })).not.toThrow()
  })
})
