import { Note } from 'tonal'
import type { Quality } from './types'

/** Which upper extensions are present — each is independent (9th without 7th = add9). */
export interface ExtensionFlags {
  seventh: boolean
  ninth: boolean
  eleventh: boolean
}

export const NO_EXTENSIONS: ExtensionFlags = {
  seventh: false,
  ninth: false,
  eleventh: false,
}

export type Extension = keyof ExtensionFlags

/** A cumulative "level", used only to seed a sensible default per genre. */
export type ExtensionLevel = 'triad' | 'seventh' | 'ninth' | 'eleventh'

export function flagsFromLevel(level: ExtensionLevel): ExtensionFlags {
  return {
    seventh: level !== 'triad',
    ninth: level === 'ninth' || level === 'eleventh',
    eleventh: level === 'eleventh',
  }
}

type ExtendableFamily = 'maj' | 'min' | 'dom'
type Family = ExtendableFamily | 'dim' | 'halfdim' | 'aug' | 'sus2' | 'sus4'

function family(quality: Quality): Family {
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

// Triad + natural-7th intervals for the families that take independent extensions.
const CORE: Record<
  ExtendableFamily,
  { third: string; fifth: string; seventh: string }
> = {
  maj: { third: '3M', fifth: '5P', seventh: '7M' },
  min: { third: '3m', fifth: '5P', seventh: '7m' },
  dom: { third: '3M', fifth: '5P', seventh: '7m' },
}

// Qualities that ignore the extension flags (rendered fixed).
const FIXED: Record<
  'dim' | 'halfdim' | 'aug' | 'sus2' | 'sus4',
  { intervals: string[]; suffix: string }
> = {
  dim: { intervals: ['1P', '3m', '5d', '6M'], suffix: 'dim7' },
  halfdim: { intervals: ['1P', '3m', '5d', '7m'], suffix: 'min7(b5)' },
  aug: { intervals: ['1P', '3M', '5A'], suffix: 'aug' },
  sus2: { intervals: ['1P', '2M', '5P'], suffix: 'sus2' },
  sus4: { intervals: ['1P', '4P', '5P'], suffix: 'sus4' },
}

const TRIAD_TOKEN: Record<ExtendableFamily, string> = {
  maj: '',
  min: 'min',
  dom: '',
}
const SEVENTH_TOKEN: Record<ExtendableFamily, Record<7 | 9 | 11, string>> = {
  maj: { 7: 'maj7', 9: 'maj9', 11: 'maj11' },
  min: { 7: 'min7', 9: 'min9', 11: 'min11' },
  dom: { 7: '7', 9: '9', 11: '11' },
}

function extendableSuffix(fam: ExtendableFamily, ext: ExtensionFlags): string {
  const { seventh, ninth, eleventh } = ext
  if (!seventh && !ninth && !eleventh) return TRIAD_TOKEN[fam]

  if (seventh) {
    const level = ninth && eleventh ? 11 : ninth ? 9 : 7
    let s = SEVENTH_TOKEN[fam][level]
    if (eleventh && !ninth) s += '(add11)' // 11 without 9
    return s
  }

  // No 7th → added-tone chord on the triad.
  const adds: string[] = []
  if (ninth) adds.push('add9')
  if (eleventh) adds.push('add11')
  return fam === 'min' ? `min(${adds.join(',')})` : adds.join('')
}

/** Whether a quality responds to the 7/9/11 extension flags (maj/min/dom families). */
export function isExtendable(quality: Quality): boolean {
  const fam = family(quality)
  return fam === 'maj' || fam === 'min' || fam === 'dom'
}

/** Display suffix for a chord at the given extension flags. */
export function chordSuffix(quality: Quality, ext: ExtensionFlags): string {
  const fam = family(quality)
  if (fam === 'maj' || fam === 'min' || fam === 'dom') {
    return extendableSuffix(fam, ext)
  }
  return FIXED[fam].suffix
}

/** Full chord symbol: root + suffix. */
export function renderSymbol(
  root: string,
  quality: Quality,
  ext: ExtensionFlags,
): string {
  return `${root}${chordSuffix(quality, ext)}`
}

/** Intervals (from the root) making up the chord at the given extensions. */
export function chordIntervals(
  quality: Quality,
  ext: ExtensionFlags,
): string[] {
  const fam = family(quality)
  if (fam !== 'maj' && fam !== 'min' && fam !== 'dom') {
    return FIXED[fam].intervals
  }
  const core = CORE[fam]
  const intervals = ['1P', core.third, core.fifth]
  if (ext.seventh) intervals.push(core.seventh)
  if (ext.ninth) intervals.push('9M')
  if (ext.eleventh) intervals.push('11P')
  return intervals
}

/** Spelled note names of the chord at the given extensions. */
export function chordNotes(
  root: string,
  quality: Quality,
  ext: ExtensionFlags,
): string[] {
  return chordIntervals(quality, ext)
    .map((iv) => Note.transpose(root, iv))
    .filter((n): n is string => !!n)
}
