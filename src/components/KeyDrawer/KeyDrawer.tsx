'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { MAJOR_TONICS, MINOR_TONICS } from '@/lib/theory/keys'
import { STRATEGIES } from '@/lib/theory/substitutions'
import { STYLE_LIST } from '@/lib/theory/styles'
import type { Mode } from '@/lib/theory/types'
import type { Waveform } from '@/lib/audio/envelope'
import { useEditor } from '@/state/EditorProvider'
import type { Extension } from '@/state/editor'
import { CollapsibleSection } from '@/components/CollapsibleSection/CollapsibleSection'
import styles from './KeyDrawer.module.css'

interface KeyDrawerProps {
  open: boolean
  onClose: () => void
}

const WAVEFORMS: Waveform[] = ['sine', 'triangle', 'sawtooth', 'square']
const EXTENSIONS: { ext: Extension; label: string }[] = [
  { ext: 'seventh', label: '7th' },
  { ext: 'ninth', label: '9th' },
  { ext: 'eleventh', label: '11th' },
]

export function KeyDrawer({ open, onClose }: KeyDrawerProps) {
  const { state, dispatch } = useEditor()
  const tonics = state.key.mode === 'major' ? MAJOR_TONICS : MINOR_TONICS
  const env = state.envelope
  const closeRef = useRef<HTMLButtonElement>(null)

  // When opened as an overlay (small screens), move focus in + close on Escape.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function changeMode(mode: Mode) {
    const list = mode === 'major' ? MAJOR_TONICS : MINOR_TONICS
    const tonic = list.includes(state.key.tonic as never)
      ? state.key.tonic
      : list[0]
    dispatch({ type: 'setKey', key: { tonic, mode } })
  }

  return (
    <>
      <div
        className={`${styles.scrim} ${open ? styles.scrimOpen : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        aria-label="Settings"
      >
        <header className={styles.head}>
          <h2 className={styles.title}>Menu</h2>
          <button
            ref={closeRef}
            className={styles.close}
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </header>

        <nav className={styles.nav}>
          <Link href="/" onClick={onClose}>
            Home
          </Link>
          <Link href="/songs" onClick={onClose}>
            Song list
          </Link>
        </nav>

        {/* ── Chords: everything that shapes the progression ── */}
        <CollapsibleSection title="Chords" storageKey="chords" defaultOpen>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span>Genre</span>
            </div>
            <div className={styles.genre} role="group" aria-label="Genre">
              {STYLE_LIST.map((s) => (
                <button
                  key={s.id}
                  className={s.id === state.style ? styles.genreOn : ''}
                  aria-pressed={s.id === state.style}
                  title={s.description}
                  onClick={() => dispatch({ type: 'setStyle', style: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className={styles.note}>
              {STYLE_LIST.find((s) => s.id === state.style)?.description}
            </p>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span>Key</span>
              <strong>
                {state.key.tonic}
                {state.key.mode === 'major' ? 'maj' : 'min'}
              </strong>
            </div>

            <div
              className={styles.toggle}
              role="group"
              aria-label="Key quality"
            >
              <button
                className={state.key.mode === 'major' ? styles.toggleOn : ''}
                aria-pressed={state.key.mode === 'major'}
                onClick={() => changeMode('major')}
              >
                Maj
              </button>
              <button
                className={state.key.mode === 'minor' ? styles.toggleOn : ''}
                aria-pressed={state.key.mode === 'minor'}
                onClick={() => changeMode('minor')}
              >
                min
              </button>
            </div>

            <div className={styles.tonics} role="group" aria-label="Tonic">
              {tonics.map((tonic) => (
                <button
                  key={tonic}
                  className={tonic === state.key.tonic ? styles.tonicOn : ''}
                  aria-pressed={tonic === state.key.tonic}
                  onClick={() =>
                    dispatch({
                      type: 'setKey',
                      key: { tonic, mode: state.key.mode },
                    })
                  }
                >
                  {tonic}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span>Extensions</span>
            </div>
            <div
              className={styles.exts}
              role="group"
              aria-label="Chord extensions"
            >
              {EXTENSIONS.map(({ ext, label }) => (
                <label key={ext}>
                  <input
                    type="checkbox"
                    checked={state.extensions[ext]}
                    onChange={() => dispatch({ type: 'toggleExtension', ext })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span>Substitutions</span>
            </div>
            <ul className={styles.strategies}>
              {STRATEGIES.map((s) => (
                <li key={s.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={state.enabledStrategies.includes(s.id)}
                      onChange={() =>
                        dispatch({ type: 'toggleStrategy', id: s.id })
                      }
                    />
                    {s.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </CollapsibleSection>

        {/* ── Sound: the player / synth ── */}
        <CollapsibleSection title="Sound" storageKey="sound">
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span>Envelope</span>
              <strong>{summariseWaveforms(env.waveforms)}</strong>
            </div>
            <EnvSlider
              label="Attack"
              value={env.attack}
              min={0}
              max={0.5}
              step={0.005}
              onChange={(attack) =>
                dispatch({ type: 'setEnvelope', envelope: { attack } })
              }
            />
            <EnvSlider
              label="Decay"
              value={env.decay}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(decay) =>
                dispatch({ type: 'setEnvelope', envelope: { decay } })
              }
            />
            <EnvSlider
              label="Sustain"
              value={env.sustain}
              min={0}
              max={1}
              step={0.05}
              onChange={(sustain) =>
                dispatch({ type: 'setEnvelope', envelope: { sustain } })
              }
            />
            <EnvSlider
              label="Release"
              value={env.release}
              min={0}
              max={2}
              step={0.05}
              onChange={(release) =>
                dispatch({ type: 'setEnvelope', envelope: { release } })
              }
            />
            <div className={styles.waves} role="group" aria-label="Waveforms">
              {WAVEFORMS.map((w) => {
                const on = env.waveforms.includes(w)
                // Disable deselect when this is the only one on — we always
                // need at least one waveform to actually make sound.
                const onlyOne = on && env.waveforms.length === 1
                return (
                  <button
                    key={w}
                    className={on ? styles.tonicOn : ''}
                    aria-pressed={on}
                    aria-label={`${w} waveform`}
                    disabled={onlyOne}
                    title={
                      onlyOne ? 'At least one waveform must stay on' : undefined
                    }
                    onClick={() =>
                      dispatch({
                        type: 'setEnvelope',
                        envelope: { waveforms: toggleWaveform(env.waveforms, w) },
                      })
                    }
                  >
                    {w}
                  </button>
                )
              })}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span>Octave</span>
              <strong>
                {state.octave > 0 ? `+${state.octave}` : state.octave}
              </strong>
            </div>
            <input
              type="range"
              min={-2}
              max={2}
              step={1}
              value={state.octave}
              onChange={(e) =>
                dispatch({ type: 'setOctave', octave: Number(e.target.value) })
              }
              aria-label="Playback octave"
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span>Tempo</span>
              <strong>{state.bpm} bpm</strong>
            </div>
            <input
              type="range"
              min={40}
              max={200}
              value={state.bpm}
              onChange={(e) =>
                dispatch({ type: 'setBpm', bpm: Number(e.target.value) })
              }
              aria-label="Tempo in beats per minute"
            />
            <label className={styles.mute}>
              <input
                type="checkbox"
                checked={state.muted}
                onChange={() => dispatch({ type: 'toggleMute' })}
              />
              Mute
            </label>
          </section>
        </CollapsibleSection>

        {/* ── Display: diagrams shown under each chord ── */}
        <CollapsibleSection title="Display" storageKey="display">
          <section className={styles.section}>
            <label className={styles.mute}>
              <input
                type="checkbox"
                checked={state.showGuitar}
                onChange={() => dispatch({ type: 'toggleGuitar' })}
              />
              Show guitar chords
            </label>
            <label className={styles.mute}>
              <input
                type="checkbox"
                checked={state.showPiano}
                onChange={() => dispatch({ type: 'togglePiano' })}
              />
              Show piano chords
            </label>
          </section>
        </CollapsibleSection>
      </aside>
    </>
  )
}

/**
 * One-line summary for the section-head: "sine" (1), "sine + triangle" (2),
 * "3 waves" (3+). Tabular-nums in the CSS keeps any digit-changes stable.
 */
function summariseWaveforms(waveforms: Waveform[]): string {
  if (waveforms.length <= 1) return waveforms[0] ?? ''
  if (waveforms.length === 2) return `${waveforms[0]} + ${waveforms[1]}`
  return `${waveforms.length} waves`
}

/** Add or remove `w` from the list; refuse to leave the list empty. */
function toggleWaveform(current: Waveform[], w: Waveform): Waveform[] {
  if (current.includes(w)) {
    const next = current.filter((x) => x !== w)
    return next.length > 0 ? next : current
  }
  // Keep a stable, predictable order (the canonical WAVEFORMS order).
  return WAVEFORMS.filter((x) => x === w || current.includes(x))
}

interface EnvSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function EnvSlider({ label, value, min, max, step, onChange }: EnvSliderProps) {
  return (
    <div className={styles.envRow}>
      <span className={styles.envLabel}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  )
}
