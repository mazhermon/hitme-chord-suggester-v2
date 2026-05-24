import MidiWriter from 'midi-writer-js'
import { Note } from 'tonal'
import { chordToMidi } from '../audio/voicing'
import type { Chord } from '../theory/types'
import type { ExtensionLevel } from '../theory/extensions'

export interface MidiOptions {
  bpm?: number
  /** Beats each chord lasts (default 2 = a half note at 4/4). */
  beatsPerChord?: number
  level?: ExtensionLevel
}

/** midi-writer-js duration code for a number of quarter-note beats. */
function durationForBeats(beats: number): string {
  if (beats >= 4) return '1' // whole
  if (beats >= 2) return '2' // half
  return '4' // quarter
}

/**
 * Build a Standard MIDI File (one track) from a progression: each chord is a
 * block of notes lasting `beatsPerChord`, played in sequence at `bpm`. Returns
 * the raw .mid bytes — drop the file into Logic/Ableton (drag-in or Import MIDI).
 */
export function progressionToMidi(
  chords: Chord[],
  options: MidiOptions = {},
): Uint8Array {
  const { bpm = 90, beatsPerChord = 2, level } = options
  const track = new MidiWriter.Track()
  track.setTempo(bpm)
  const duration = durationForBeats(beatsPerChord)

  for (const chord of chords) {
    const pitches = chordToMidi(chord, { level, voicing: chord.voicing })
      .map((m) => Note.fromMidi(m))
      .filter((n): n is string => n !== null)
    if (pitches.length === 0) continue
    track.addEvent(new MidiWriter.NoteEvent({ pitch: pitches, duration }))
  }

  return new MidiWriter.Writer([track]).buildFile()
}

/** Trigger a browser download of MIDI bytes as a .mid file. */
export function downloadMidi(bytes: Uint8Array, filename: string): void {
  if (typeof document === 'undefined') return
  const name = filename.endsWith('.mid') ? filename : `${filename}.mid`
  const blob = new Blob([bytes as BlobPart], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
