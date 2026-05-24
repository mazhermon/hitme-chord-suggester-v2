// midi-writer-js ships .d.ts files but its package "exports" points the types
// entry at a path that isn't published, so TS can't resolve them. Declare the
// small slice of the API we use.
declare module 'midi-writer-js' {
  interface NoteEventOptions {
    pitch: Array<string | number>
    duration: string | string[]
    velocity?: number
    wait?: string | string[]
    [key: string]: unknown
  }

  class NoteEvent {
    constructor(options: NoteEventOptions)
  }

  class Track {
    setTempo(bpm: number, tick?: number): this
    addEvent(event: NoteEvent | NoteEvent[]): this
  }

  class Writer {
    constructor(tracks: Track | Track[])
    buildFile(): Uint8Array
    dataUri(): string
    base64(): string
  }

  const MidiWriter: {
    NoteEvent: typeof NoteEvent
    Track: typeof Track
    Writer: typeof Writer
  }

  export default MidiWriter
  export { NoteEvent, Track, Writer }
}
