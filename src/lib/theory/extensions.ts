import type { Quality } from './types'

/** How "tall" a chord is rendered/voiced. */
export type ExtensionLevel = 'triad' | 'seventh' | 'ninth' | 'eleventh'

type Family =
  | 'maj'
  | 'min'
  | 'dom'
  | 'dim'
  | 'halfdim'
  | 'aug'
  | 'sus2'
  | 'sus4'

function chordFamily(quality: Quality): Family {
  switch (quality) {
    case 'maj7':
    case 'maj':
      return 'maj'
    case 'min7':
    case 'min':
      return 'min'
    case '7':
      return 'dom'
    case 'dim7':
    case 'dim':
      return 'dim'
    case 'min7b5':
      return 'halfdim'
    case 'aug':
      return 'aug'
    case 'sus2':
      return 'sus2'
    case 'sus4':
      return 'sus4'
  }
}

interface Rendered {
  /** Display suffix appended to the root (e.g. "min9"). */
  suffix: string
  /** tonal chord-type name used to look up notes for voicing. */
  tonalType: string
}

// Per family, the rendering at each level. Levels that don't exist musically
// (e.g. maj11) cap at the richest sensible voicing.
const LADDER: Record<Family, Record<ExtensionLevel, Rendered>> = {
  maj: {
    triad: { suffix: '', tonalType: 'M' },
    seventh: { suffix: 'maj7', tonalType: 'maj7' },
    ninth: { suffix: 'maj9', tonalType: 'maj9' },
    eleventh: { suffix: 'maj9', tonalType: 'maj9' }, // maj11 is dissonant → cap
  },
  min: {
    triad: { suffix: 'min', tonalType: 'm' },
    seventh: { suffix: 'min7', tonalType: 'm7' },
    ninth: { suffix: 'min9', tonalType: 'm9' },
    eleventh: { suffix: 'min11', tonalType: 'm11' },
  },
  dom: {
    triad: { suffix: '', tonalType: 'M' },
    seventh: { suffix: '7', tonalType: '7' },
    ninth: { suffix: '9', tonalType: '9' },
    eleventh: { suffix: '11', tonalType: '11' },
  },
  dim: {
    triad: { suffix: 'dim', tonalType: 'dim' },
    seventh: { suffix: 'dim7', tonalType: 'dim7' },
    ninth: { suffix: 'dim7', tonalType: 'dim7' },
    eleventh: { suffix: 'dim7', tonalType: 'dim7' },
  },
  halfdim: {
    triad: { suffix: 'dim', tonalType: 'dim' },
    seventh: { suffix: 'min7(b5)', tonalType: 'm7b5' },
    ninth: { suffix: 'min9(b5)', tonalType: 'm9b5' },
    eleventh: { suffix: 'min9(b5)', tonalType: 'm9b5' },
  },
  aug: {
    triad: { suffix: 'aug', tonalType: 'aug' },
    seventh: { suffix: 'aug', tonalType: 'aug' },
    ninth: { suffix: 'aug', tonalType: 'aug' },
    eleventh: { suffix: 'aug', tonalType: 'aug' },
  },
  sus2: {
    triad: { suffix: 'sus2', tonalType: 'sus2' },
    seventh: { suffix: 'sus2', tonalType: 'sus2' },
    ninth: { suffix: 'sus2', tonalType: 'sus2' },
    eleventh: { suffix: 'sus2', tonalType: 'sus2' },
  },
  sus4: {
    triad: { suffix: 'sus4', tonalType: 'sus4' },
    seventh: { suffix: 'sus4', tonalType: 'sus4' },
    ninth: { suffix: 'sus4', tonalType: 'sus4' },
    eleventh: { suffix: 'sus4', tonalType: 'sus4' },
  },
}

/** Render a base quality at an extension level → display suffix + tonal type. */
export function renderQuality(
  quality: Quality,
  level: ExtensionLevel,
): Rendered {
  return LADDER[chordFamily(quality)][level]
}

/** Full chord symbol for a spelled root at an extension level. */
export function renderSymbol(
  root: string,
  quality: Quality,
  level: ExtensionLevel,
): string {
  return `${root}${renderQuality(quality, level).suffix}`
}

export interface ExtensionFlags {
  seventh: boolean
  ninth: boolean
  eleventh: boolean
}

/** Extensions are cumulative — the level is the highest enabled flag. */
export function levelFromFlags(flags: ExtensionFlags): ExtensionLevel {
  if (flags.eleventh) return 'eleventh'
  if (flags.ninth) return 'ninth'
  if (flags.seventh) return 'seventh'
  return 'triad'
}
