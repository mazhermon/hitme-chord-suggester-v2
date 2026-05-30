import type { Song } from './types'

/**
 * Build a new Song by appending b's chords to a's. The result keeps a's key
 * and audio settings — b's chords come in as absolute notes (root+quality)
 * so they still sound right, but Suggest will read them against a's key.
 * That's a known limitation (mixed-key joins won't always make Nashville
 * sense); the rest of the data round-trips cleanly.
 */
export function joinSongs(
  a: Song,
  b: Song,
  newName: string,
  createdAt: number,
): Song {
  return {
    id: newName,
    name: newName,
    key: a.key,
    chords: [...a.chords, ...b.chords],
    extensions: a.extensions,
    chordExtensions:
      a.chordExtensions || b.chordExtensions
        ? [
            ...(a.chordExtensions ?? a.chords.map(() => undefined)),
            ...(b.chordExtensions ?? b.chords.map(() => undefined)),
          ].filter((x): x is NonNullable<typeof x> => x !== undefined)
        : undefined,
    locked:
      a.locked || b.locked
        ? [
            ...(a.locked ?? a.chords.map(() => false)),
            ...(b.locked ?? b.chords.map(() => false)),
          ]
        : undefined,
    envelope: a.envelope,
    bpm: a.bpm,
    octave: a.octave,
    style: a.style,
    createdAt,
  }
}

/**
 * Split a song in half, returning two new songs named "X (1)" and "X (2)".
 * Throws if the chord count isn't even (the UI should hide Split when not
 * applicable, so this is a sanity guard).
 */
export function splitSong(
  song: Song,
  createdAt: number,
): [Song, Song] {
  if (song.chords.length === 0 || song.chords.length % 2 !== 0) {
    throw new Error('splitSong: chord count must be a positive even number')
  }
  const half = song.chords.length / 2
  const slice = <T>(arr: T[] | undefined, from: number, to: number) =>
    arr ? arr.slice(from, to) : undefined

  const halfA: Song = {
    ...song,
    id: `${song.name} (1)`,
    name: `${song.name} (1)`,
    chords: song.chords.slice(0, half),
    chordExtensions: slice(song.chordExtensions, 0, half),
    locked: slice(song.locked, 0, half),
    createdAt,
  }
  const halfB: Song = {
    ...song,
    id: `${song.name} (2)`,
    name: `${song.name} (2)`,
    chords: song.chords.slice(half),
    chordExtensions: slice(song.chordExtensions, half, song.chords.length),
    locked: slice(song.locked, half, song.chords.length),
    createdAt,
  }
  return [halfA, halfB]
}

/**
 * Pick the next available name when a desired one is taken. Same logic as
 * the song-list duplicate flow, just generalised so join/split can reuse it.
 */
export function nextAvailableName(
  desired: string,
  taken: Set<string>,
): string {
  if (!taken.has(desired)) return desired
  for (let n = 2; n < 1000; n++) {
    const candidate = `${desired} (${n})`
    if (!taken.has(candidate)) return candidate
  }
  return `${desired} (${Date.now()})`
}
