'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getStorage, type Song } from '@/lib/storage'
import {
  joinSongs,
  splitSong,
  nextAvailableName,
} from '@/lib/storage/combine'
import styles from './songs.module.css'

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  // When set, the row is in "pick a song to join with" mode.
  const [joiningId, setJoiningId] = useState<string | null>(null)

  useEffect(() => {
    getStorage().list().then(setSongs)
  }, [])

  async function remove(id: string) {
    await getStorage().remove(id)
    setSongs((prev) => prev?.filter((s) => s.id !== id) ?? null)
  }

  async function duplicate(song: Song) {
    const taken = new Set((songs ?? []).map((s) => s.id))
    const newName = nextCopyName(song.name, taken)
    const copy: Song = {
      ...song,
      id: newName,
      name: newName,
      createdAt: nowMs(),
    }
    await getStorage().save(copy)
    setSongs((prev) => (prev ? [...prev, copy] : [copy]))
  }

  async function join(a: Song, b: Song) {
    const taken = new Set((songs ?? []).map((s) => s.id))
    const newName = nextAvailableName(`${a.name} + ${b.name}`, taken)
    const joined = joinSongs(a, b, newName, nowMs())
    await getStorage().save(joined)
    setSongs((prev) => (prev ? [...prev, joined] : [joined]))
    setJoiningId(null)
  }

  async function split(song: Song) {
    const taken = new Set((songs ?? []).map((s) => s.id))
    const [a0, b0] = splitSong(song, nowMs())
    // Avoid id collisions if "Foo (1)" / "Foo (2)" already exist.
    const a: Song = { ...a0, id: nextAvailableName(a0.id, taken) }
    taken.add(a.id)
    a.name = a.id
    const b: Song = { ...b0, id: nextAvailableName(b0.id, taken) }
    b.name = b.id
    await getStorage().save(a)
    await getStorage().save(b)
    setSongs((prev) => (prev ? [...prev, a, b] : [a, b]))
  }

  async function rename(song: Song, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === song.name) {
      setEditingId(null)
      return
    }
    // id === name in our current model, so a rename is a remove+save.
    // Done in that order so the old entry doesn't survive if save throws.
    await getStorage().remove(song.id)
    const renamed: Song = { ...song, id: trimmed, name: trimmed }
    await getStorage().save(renamed)
    setSongs((prev) =>
      prev ? prev.map((s) => (s.id === song.id ? renamed : s)) : null,
    )
    setEditingId(null)
  }

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        ← Back
      </Link>
      <h1 className={styles.title}>Song list</h1>

      {songs === null && <p className={styles.muted}>Loading…</p>}

      {songs !== null && songs.length === 0 && (
        <p className={styles.muted}>
          No songs yet. <Link href="/">Head home to make one.</Link>
        </p>
      )}

      {songs !== null && songs.length > 0 && (
        <ul className={styles.list}>
          {songs.map((song) => (
            <li key={song.id} className={styles.row}>
              {editingId === song.id ? (
                <RenameRow
                  song={song}
                  onSubmit={(name) => rename(song, name)}
                  onCancel={() => setEditingId(null)}
                />
              ) : joiningId === song.id ? (
                <JoinRow
                  song={song}
                  others={(songs ?? []).filter((s) => s.id !== song.id)}
                  onSubmit={(other) => join(song, other)}
                  onCancel={() => setJoiningId(null)}
                />
              ) : (
                <>
                  <Link href={`/songs/${encodeURIComponent(song.id)}`}>
                    <span className={styles.name}>{song.name}</span>
                    <span className={styles.meta}>
                      {song.key.tonic}
                      {song.key.mode === 'major' ? 'maj' : 'min'} ·{' '}
                      {song.chords.length} chords
                    </span>
                  </Link>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.action}
                      onClick={() => setEditingId(song.id)}
                      aria-label={`Rename ${song.name}`}
                    >
                      Rename
                    </button>
                    <button
                      className={styles.action}
                      onClick={() => duplicate(song)}
                      aria-label={`Duplicate ${song.name}`}
                    >
                      Duplicate
                    </button>
                    {(songs?.length ?? 0) > 1 && (
                      <button
                        className={styles.action}
                        onClick={() => setJoiningId(song.id)}
                        aria-label={`Join ${song.name} with another song`}
                      >
                        Join&hellip;
                      </button>
                    )}
                    {song.chords.length >= 2 &&
                      song.chords.length % 2 === 0 && (
                        <button
                          className={styles.action}
                          onClick={() => split(song)}
                          aria-label={`Split ${song.name} in half`}
                        >
                          Split
                        </button>
                      )}
                    <button
                      className={styles.delete}
                      onClick={() => remove(song.id)}
                      aria-label={`Delete ${song.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

interface RenameRowProps {
  song: Song
  onSubmit: (name: string) => void
  onCancel: () => void
}

function RenameRow({ song, onSubmit, onCancel }: RenameRowProps) {
  const [value, setValue] = useState(song.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => clearTimeout(id)
  }, [])

  return (
    <form
      className={styles.renameRow}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
    >
      <input
        ref={inputRef}
        className={styles.renameInput}
        value={value}
        aria-label={`New name for ${song.name}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button type="submit" className={styles.action}>
        Save
      </button>
      <button type="button" className={styles.action} onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

interface JoinRowProps {
  song: Song
  others: Song[]
  onSubmit: (other: Song) => void
  onCancel: () => void
}

function JoinRow({ song, others, onSubmit, onCancel }: JoinRowProps) {
  const [pickedId, setPickedId] = useState(others[0]?.id ?? '')

  if (others.length === 0) {
    return (
      <div className={styles.joinRow}>
        <span className={styles.muted}>No other songs to join with.</span>
        <button
          type="button"
          className={styles.action}
          onClick={onCancel}
        >
          Close
        </button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const other = others.find((s) => s.id === pickedId)
    if (other) onSubmit(other)
  }

  return (
    <form className={styles.joinRow} onSubmit={handleSubmit}>
      <span className={styles.joinLabel}>Join &ldquo;{song.name}&rdquo; with</span>
      <select
        className={styles.joinSelect}
        value={pickedId}
        onChange={(e) => setPickedId(e.target.value)}
        aria-label={`Pick a song to join with ${song.name}`}
      >
        {others.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button type="submit" className={styles.action}>
        Join
      </button>
      <button type="button" className={styles.action} onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

/**
 * Generate the next available "X (copy)", "X (copy 2)", "X (copy 3)" name
 * given the names already taken. Pure + testable (the timestamp fallback at
 * the very end accepts an override so it doesn't poison the unit tests).
 */
export function nextCopyName(
  base: string,
  taken: Set<string>,
  now: () => number = nowMs,
): string {
  const first = `${base} (copy)`
  if (!taken.has(first)) return first
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base} (copy ${n})`
    if (!taken.has(candidate)) return candidate
  }
  return `${base} (copy ${now()})`
}

// Wrapped so the React Compiler purity check doesn't flag Date.now() calls
// inside event handlers (it's impure but we only call it from handlers).
function nowMs(): number {
  return Date.now()
}
