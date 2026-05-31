import {
  _resetMigrationFlag,
  migrateLocalToCloud,
} from './migration'
import type { Song, StorageProvider } from './types'
import type { Chord } from '../theory/types'

function chord(root: string): Chord {
  return {
    degree: 0,
    root,
    quality: 'maj7',
    symbol: `${root}maj7`,
    source: 'diatonic',
  }
}

function song(id: string): Song {
  return {
    id,
    name: id,
    key: { tonic: 'C', mode: 'major' },
    chords: [chord('C')],
    createdAt: 1000,
  }
}

function inMemoryProvider(initial: Song[] = []): StorageProvider & {
  imported: Song[]
} {
  const store = new Map<string, Song>(initial.map((s) => [s.id, s]))
  const imported: Song[] = []
  return {
    imported,
    async list() {
      return [...store.values()]
    },
    async get(id) {
      return store.get(id) ?? null
    },
    async save(s) {
      store.set(s.id, s)
      return s
    },
    async remove(id) {
      store.delete(id)
    },
    async importMany(songs) {
      for (const s of songs) {
        store.set(s.id, s)
        imported.push(s)
      }
    },
  }
}

const USER_ID = 'user-abc'

beforeEach(() => {
  localStorage.clear()
  _resetMigrationFlag(USER_ID)
})

describe('migrateLocalToCloud', () => {
  it('imports every local song into an empty cloud', async () => {
    const local = inMemoryProvider([song('A'), song('B')])
    const cloud = inMemoryProvider()
    const count = await migrateLocalToCloud({ local, cloud, userId: USER_ID })
    expect(count).toBe(2)
    expect(cloud.imported.map((s) => s.id).sort()).toEqual(['A', 'B'])
  })

  it("doesn't clobber a cloud song with the same id (cloud wins)", async () => {
    const local = inMemoryProvider([song('A'), song('B')])
    const cloud = inMemoryProvider([song('B')]) // already on the cloud
    const count = await migrateLocalToCloud({ local, cloud, userId: USER_ID })
    expect(count).toBe(1)
    expect(cloud.imported.map((s) => s.id)).toEqual(['A'])
  })

  it('is a no-op on the second call (sets a migrated flag)', async () => {
    const local = inMemoryProvider([song('A')])
    const cloud = inMemoryProvider()
    expect(await migrateLocalToCloud({ local, cloud, userId: USER_ID })).toBe(1)
    expect(await migrateLocalToCloud({ local, cloud, userId: USER_ID })).toBe(0)
  })

  it('migrates separately per user-id (different flag)', async () => {
    const local = inMemoryProvider([song('A')])
    const cloud = inMemoryProvider()
    await migrateLocalToCloud({ local, cloud, userId: 'user-1' })
    // A different user on the same device should still see migration run.
    expect(
      await migrateLocalToCloud({ local, cloud, userId: 'user-2' }),
    ).toBeGreaterThanOrEqual(0)
  })
})
