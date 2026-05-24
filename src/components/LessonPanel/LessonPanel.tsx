'use client'

import type { Lesson } from '@/lib/theory/lessons'
import styles from './LessonPanel.module.css'

interface LessonPanelProps {
  lesson: Lesson | null
  onClose: () => void
}

/** Right-side panel with a short music-theory lesson for a chord's provenance. */
export function LessonPanel({ lesson, onClose }: LessonPanelProps) {
  if (!lesson) return null
  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden />
      <aside className={styles.panel} aria-label="Chord lesson">
        <header className={styles.head}>
          <h2 className={styles.title}>{lesson.title}</h2>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label="Close lesson"
          >
            ×
          </button>
        </header>
        <p className={styles.kicker}>Why this works</p>
        <p className={styles.body}>{lesson.body}</p>
      </aside>
    </>
  )
}
