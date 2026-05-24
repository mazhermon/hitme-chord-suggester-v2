'use client'

import { useState } from 'react'
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
  if (!open) return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <div className={styles.scrim} onClick={onCancel}>
      <form
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className={styles.title}>Choose a song name</h2>
        <input
          className={styles.input}
          autoFocus
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
