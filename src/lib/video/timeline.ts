/**
 * Maps a progression onto a wall-clock timeline so the exported video can light
 * the right chord at the right moment. The timing here mirrors `playProgression`
 * in the audio engine (default 90bpm, 2 beats/chord) so picture matches sound.
 */
export interface TimelineSlot {
  index: number
  start: number
  end: number
}

export interface TimelineOptions {
  bpm?: number
  beatsPerChord?: number
}

export function chordTimeline(
  count: number,
  { bpm = 90, beatsPerChord = 2 }: TimelineOptions = {},
): { slots: TimelineSlot[]; duration: number } {
  const secondsPerChord = (60 / bpm) * beatsPerChord
  const slots: TimelineSlot[] = Array.from({ length: count }, (_, index) => ({
    index,
    start: index * secondsPerChord,
    end: (index + 1) * secondsPerChord,
  }))
  return { slots, duration: count * secondsPerChord }
}

/** Index of the chord sounding at time `t` (clamped to the ends); -1 if empty. */
export function activeIndexAt(slots: TimelineSlot[], t: number): number {
  if (slots.length === 0) return -1
  if (t < slots[0].start) return slots[0].index
  const last = slots[slots.length - 1]
  if (t >= last.end) return last.index
  const hit = slots.find((s) => t >= s.start && t < s.end)
  return hit ? hit.index : last.index
}
