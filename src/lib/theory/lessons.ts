export type ConceptId =
  | 'diatonic'
  | 'modal-interchange'
  | 'secondary-dominant'
  | 'tritone'
  | 'diatonic-third'
  | 'suspension'
  | 'planing'

export interface Lesson {
  id: ConceptId
  title: string
  body: string
}

/** Short music-theory lessons explaining why each substitution works. */
export const LESSONS: Record<ConceptId, Lesson> = {
  diatonic: {
    id: 'diatonic',
    title: 'Diatonic chord',
    body: 'This chord is built only from the notes of the current key — no borrowed or altered notes. Diatonic chords are the "home" chords of a key; they sound stable and expected, and they\'re the baseline the substitutions below depart from.',
  },
  'modal-interchange': {
    id: 'modal-interchange',
    title: 'Modal interchange (borrowed chord)',
    body: 'The chord is borrowed from a parallel mode — a scale built on the same tonic but with different notes (e.g. C dorian or C aeolian instead of C major). Because it shares the tonic, it still feels connected to the key, but the altered note adds fresh colour. Famous examples are the minor iv and the bVI borrowed from the parallel minor.',
  },
  'secondary-dominant': {
    id: 'secondary-dominant',
    title: 'Secondary dominant',
    body: 'A dominant 7th chord that briefly treats another chord as a temporary "home". V7/ii (A7 → Dm) borrows the strong V→I pull and points it at the ii chord instead of the tonic. The chromatic note it introduces (the leading tone of the target) creates a satisfying, goal-directed resolution.',
  },
  tritone: {
    id: 'tritone',
    title: 'Tritone substitution',
    body: 'Replace a dominant 7th with the dominant 7th a tritone away (G7 → Db7). The two chords share the same 3rd and 7th — the tritone that gives a dominant its tension — so they resolve the same way, but the root moves chromatically down by a half step for a smoother, jazzier bass line.',
  },
  'diatonic-third': {
    id: 'diatonic-third',
    title: 'Diatonic third substitution',
    body: 'Swap a chord for the diatonic chord a third above or below it (I ↔ iii or vi). Chords a third apart share two of their three notes, so the substitute keeps most of the harmony while shifting its function — the classic move of replacing I with vi for a softer landing.',
  },
  suspension: {
    id: 'suspension',
    title: 'Suspended chord',
    body: 'A sus2 or sus4 replaces the chord\'s 3rd with a 2nd or 4th. Removing the 3rd takes away the major/minor flavour, leaving an open, unresolved sound that traditionally "wants" to resolve back to the 3rd — great for tension or a floating, modal feel.',
  },
  planing: {
    id: 'planing',
    title: 'Planing (parallel motion)',
    body: 'The whole chord shape is moved up or down by a fixed interval, keeping its exact quality (Cm9 → Dm9). It ignores the key\'s usual harmony — the chords move in parallel — which is why it sounds hypnotic and non-functional. It\'s the engine behind the classic house "pitched stab" and a lot of impressionist (Debussy) harmony.',
  },
}

/** Infer the concept behind a chord's `source` provenance label. */
export function lessonForSource(source: string): Lesson | null {
  if (source.startsWith('diatonic 3rd')) return LESSONS['diatonic-third']
  if (source === 'diatonic') return LESSONS.diatonic
  if (source.startsWith('from ')) return LESSONS['modal-interchange']
  if (source.startsWith('V/')) return LESSONS['secondary-dominant']
  if (source.startsWith('tritone')) return LESSONS.tritone
  if (source.startsWith('sus')) return LESSONS.suspension
  if (source.startsWith('planed')) return LESSONS.planing
  return null
}
