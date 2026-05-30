'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button/Button'
import styles from './SaveDialog.module.css'

interface SaveDialogProps {
  open: boolean
  /**
   * If set, the dialog opens to a two-choice screen: save *to this name* (i.e.
   * overwrite the existing song) or save as new (prompts for a fresh name).
   * If absent, it opens straight to the name-input form.
   */
  existingName?: string
  /** Pre-fill the name input. */
  defaultName?: string
  onCancel: () => void
  /**
   * Called with the chosen name and a flag for whether this is meant to
   * overwrite the existing song (true = save to existing name; false = new).
   */
  onSave: (name: string, overwrite: boolean) => void
}

export function SaveDialog({
  open,
  existingName,
  defaultName = '',
  onCancel,
  onSave,
}: SaveDialogProps) {
  // Two internal modes when there's an existingName: 'choose' (overwrite vs new)
  // and 'input' (enter a new name). With no existingName we start in 'input'.
  const [mode, setMode] = useState<'choose' | 'input'>(
    existingName ? 'choose' : 'input',
  )
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLFormElement>(null)
  const firstButtonRef = useRef<HTMLButtonElement>(null)

  // When the dialog re-opens, reset mode + name based on the latest props.
  // setTimeout(0) keeps the React Compiler lint happy (no sync setState in
  // effect bodies) without delaying the user-visible reset noticeably.
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      setMode(existingName ? 'choose' : 'input')
      setName(defaultName)
    }, 0)
    return () => clearTimeout(id)
  }, [open, existingName, defaultName])

  // Escape to close, autofocus, trap Tab, restore focus on close.
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (mode === 'input') inputRef.current?.focus()
    else firstButtonRef.current?.focus()

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
  }, [open, mode, onCancel])

  if (!open) return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSave(trimmed, false)
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
        {mode === 'choose' && existingName ? (
          <>
            <h2 id="save-dialog-title" className={styles.title}>
              Save changes
            </h2>
            <p className={styles.subtitle}>
              You&apos;re editing <strong>{existingName}</strong>.
            </p>
            <div className={styles.choices}>
              <Button
                ref={firstButtonRef}
                type="button"
                variant="primary"
                onClick={() => onSave(existingName, true)}
              >
                Save to &ldquo;{existingName}&rdquo;
              </Button>
              <Button
                type="button"
                variant="pill"
                onClick={() => setMode('input')}
              >
                Save as new&hellip;
              </Button>
            </div>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 id="save-dialog-title" className={styles.title}>
              {existingName ? 'Save as new song' : 'Choose a song name'}
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
              {existingName && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('choose')}
                >
                  ← Back
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
