'use client'

import Link from 'next/link'
import { MAJOR_TONICS, MINOR_TONICS } from '@/lib/theory/keys'
import { STRATEGIES } from '@/lib/theory/substitutions'
import type { Mode } from '@/lib/theory/types'
import { useEditor } from '@/state/EditorProvider'
import styles from './KeyDrawer.module.css'

interface KeyDrawerProps {
  open: boolean
  onClose: () => void
}

export function KeyDrawer({ open, onClose }: KeyDrawerProps) {
  const { state, dispatch } = useEditor()
  const tonics = state.key.mode === 'major' ? MAJOR_TONICS : MINOR_TONICS

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
        aria-hidden={!open}
        aria-label="Settings"
      >
        <header className={styles.head}>
          <h2 className={styles.title}>Menu</h2>
          <button
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

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span>Key</span>
            <strong>
              {state.key.tonic}
              {state.key.mode === 'major' ? 'maj' : 'min'}
            </strong>
          </div>

          <div className={styles.toggle} role="group" aria-label="Key quality">
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
      </aside>
    </>
  )
}
