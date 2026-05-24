// Public API for the music-theory engine.
export type { Chord, KeyContext, Mode, Quality } from './types'
export { QUALITY_SUFFIX, QUALITY_TONAL } from './types'
export { noteToMidi, midiToFreq, noteToFreq } from './notes'
export { scaleForKey, ALL_KEYS, MAJOR_TONICS, MINOR_TONICS } from './keys'
export { MODE_NAMES, modeQuality } from './modes'
export { chordSymbol, realizeChord, homeModeIndex } from './chords'
export { ROMAN_NUMERALS, romanForDegree, degreeForRoman } from './nashville'
export {
  STRATEGIES,
  suggestForProgression,
  type SuggestOptions,
} from './substitutions'
