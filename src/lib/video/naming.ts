/**
 * Tiny pure-string helpers for video export filenames. Lives in its own module
 * so callers (EditorScreen, song-detail page) can import them without dragging
 * in the MediaRecorder + canvas + timeline code that record.ts statically
 * imports. Keeps the initial JS bundle slim for users who never tap Video.
 */

export const BRAND = 'hitme-progression'

/**
 * Base filename for an export: the brand plus the song name (slugified), or
 * `-untitled` when the progression hasn't been saved.
 * e.g. `hitme-progression-untitled`, `hitme-progression-my-cool-song`.
 */
export function progressionBasename(songName?: string | null): string {
  const slug = (songName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug ? `${BRAND}-${slug}` : `${BRAND}-untitled`
}

/** A sensible download filename for a video Blob, e.g. `hitme-progression.mp4`. */
export function videoFilename(blob: Blob, basename = BRAND): string {
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  return `${basename}.${ext}`
}

/** Wrap a Blob in a named File so the share sheet / download keep the name. */
export function videoFile(blob: Blob, basename = BRAND): File {
  return new File([blob], videoFilename(blob, basename), { type: blob.type })
}
