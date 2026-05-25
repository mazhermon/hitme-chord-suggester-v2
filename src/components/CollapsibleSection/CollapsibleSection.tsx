'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import styles from './CollapsibleSection.module.css'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  /** Persist open/closed under this key (remembered across visits). */
  storageKey?: string
  children: ReactNode
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  storageKey,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()
  const key = storageKey ? `chordhelper.section.${storageKey}` : null

  // Restore remembered state. Deferred to a timeout so we never set state
  // synchronously inside an effect, and avoid a hydration mismatch.
  useEffect(() => {
    if (!key) return
    const id = setTimeout(() => {
      const saved = localStorage.getItem(key)
      if (saved !== null) setOpen(saved === '1')
    }, 0)
    return () => clearTimeout(id)
  }, [key])

  function toggle() {
    const next = !open
    setOpen(next)
    if (key) {
      try {
        localStorage.setItem(key, next ? '1' : '0')
      } catch {
        // storage disabled — fine, it just won't persist.
      }
    }
  }

  return (
    <section className={styles.group}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <span className={styles.caret} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        {title}
      </button>
      {open && (
        <div id={bodyId} className={styles.body}>
          {children}
        </div>
      )}
    </section>
  )
}
