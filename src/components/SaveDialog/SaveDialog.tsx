'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button/Button'
import styles from './SaveDialog.module.css'

interface SaveDialogProps {
  open: boolean
  defaultName?: string
  onCancel: () => void
  onSave: (name: string) => void
}

export function SaveDialog({
  open,
  defaultName = '',
  onCancel,
  onSave,
}: SaveDialogProps) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLFormElement>(null)

  // Escape to close, focus the input on open, trap Tab, restore focus on close.
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    inputRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable =
        dialogRef.current.querySelectorAll<HTMLElement>('input, button')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open, onCancel])

  if (!open) return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <div className={styles.scrim} onClick={onCancel}>
      <form
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id="save-dialog-title" className={styles.title}>
          Choose a song name
        </h2>
        <input
          ref={inputRef}
          className={styles.input}
          value={name}
          placeholder="Song name"
          aria-label="Song name"
          onChange={(e) => setName(e.target.value)}
        />
        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </div>
  )
}
