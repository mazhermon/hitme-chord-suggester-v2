import { createLocalProvider } from './local'
import type { KeyValueBackend, Song } from './types'

function memoryBackend(): KeyValueBackend {
  const store = new Map<string, string>()
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
  }
}

function makeSong(id: string, name: string): Song {
  return {
    id,
    name,
    key: { tonic: 'C', mode: 'major' },
    chords: [
      {
        degree: 0,
        root: 'C',
        quality: 'maj7',
        symbol: 'Cmaj7',
        source: 'diatonic',
      },
    ],
    createdAt: 1,
  }
}

describe('local storage provider', () => {
  it('saves and lists songs', async () => {
    const provider = createLocalProvider(memoryBackend())
    await provider.save(makeSong('a', 'First'))
    await provider.save(makeSong('b', 'Second'))
    const songs = await provider.list()
    expect(songs.map((s) => s.name).sort()).toEqual(['First', 'Second'])
  })

  it('gets a song by id and returns null for unknown ids', async () => {
    const provider = createLocalProvider(memoryBackend())
    await provider.save(makeSong('a', 'First'))
    expect((await provider.get('a'))?.name).toBe('First')
    expect(await provider.get('nope')).toBeNull()
  })

  it('upserts a song with the same id', async () => {
    const provider = createLocalProvider(memoryBackend())
    await provider.save(makeSong('a', 'First'))
    await provider.save(makeSong('a', 'Renamed'))
    const songs = await provider.list()
    expect(songs).toHaveLength(1)
    expect(songs[0].name).toBe('Renamed')
  })

  it('removes a song', async () => {
    const provider = createLocalProvider(memoryBackend())
    await provider.save(makeSong('a', 'First'))
    await provider.remove('a')
    expect(await provider.list()).toEqual([])
  })
})
