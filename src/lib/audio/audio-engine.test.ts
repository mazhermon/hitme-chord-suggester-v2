import { primeAudioForMobile } from './audio-engine'

function mockAudio() {
  const source = { buffer: null as unknown, connect: vi.fn(), start: vi.fn() }
  return {
    destination: { id: 'destination' },
    createBuffer: vi.fn(() => ({ length: 1 })),
    createBufferSource: vi.fn(() => source),
    source,
  }
}

describe('primeAudioForMobile', () => {
  it("sets the audio session to playback so iOS's silent switch doesn't mute it", () => {
    const audio = mockAudio()
    const nav = { audioSession: { type: 'ambient' } }
    primeAudioForMobile(audio as unknown as AudioContext, nav)
    expect(nav.audioSession.type).toBe('playback')
  })

  it('kicks the context awake with a one-sample silent buffer', () => {
    const audio = mockAudio()
    primeAudioForMobile(audio as unknown as AudioContext, {})
    expect(audio.createBufferSource).toHaveBeenCalled()
    expect(audio.source.connect).toHaveBeenCalledWith(audio.destination)
    expect(audio.source.start).toHaveBeenCalledWith(0)
  })

  it('is a safe no-op when the audio session API is unavailable', () => {
    expect(() =>
      primeAudioForMobile(mockAudio() as unknown as AudioContext, {}),
    ).not.toThrow()
  })
})
