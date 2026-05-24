import MidiWriter from 'midi-writer-js'
import { Note } from 'tonal'
import { chordToMidi } from '../audio/voicing'
import type { Chord } from '../theory/types'
import type { ExtensionFlags } from '../theory/extensions'

export interface MidiOptions {
  /** Beats each chord lasts (default 2 = a half note at 4/4). */
  beatsPerChord?: number
  /** Extension flags per chord (aligned to `chords`). */
  extensions?: ExtensionFlags[]
}

/** midi-writer-js duration code for a number of quarter-note beats. */
function durationForBeats(beats: number): string {
  if (beats >= 4) return '1' // whole
  if (beats >= 2) return '2' // half
  return '4' // quarter
}

/**
 * Build a Standard MIDI File (one track) from a progression: each chord is a
 * block of notes lasting `beatsPerChord`, played in sequence. Returns the raw
 * .mid bytes — drop the file into Logic/Ableton (drag-in or Import MIDI).
 *
 * Deliberately writes NO tempo event: note positions are stored in musical beats
 * (ticks), so the chords land on the right beats at whatever tempo the user's
 * project is set to, and there's no tempo to override their project.
 */
export function progressionToMidi(
  chords: Chord[],
  options: MidiOptions = {},
): Uint8Array {
  const { beatsPerChord = 2, extensions } = options
  const track = new MidiWriter.Track()
  const duration = durationForBeats(beatsPerChord)

  chords.forEach((chord, i) => {
    const pitches = chordToMidi(chord, {
      extensions: extensions?.[i],
      voicing: chord.voicing,
    })
      .map((m) => Note.fromMidi(m))
      .filter((n): n is string => n !== null)
    if (pitches.length === 0) return
    track.addEvent(new MidiWriter.NoteEvent({ pitch: pitches, duration }))
  })

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
