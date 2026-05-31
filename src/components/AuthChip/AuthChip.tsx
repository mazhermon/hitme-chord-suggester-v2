'use client'

/**
 * Tiny header affordance: shows the signed-in email + a menu with sign-out
 * and delete-account. Renders nothing for anonymous / signed-out / loading
 * states so the editor header stays clean for non-authed users.
 */

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/state/useAuth'
import styles from './AuthChip.module.css'

export function AuthChip() {
  const { status, signOut, deleteAccount } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click.
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  if (status.state !== 'authenticated') return null

  const label = status.user.email ?? 'Signed in'

  async function handleSignOut() {
    await signOut()
    setMenuOpen(false)
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    try {
      await deleteAccount()
    } catch (err) {
      window.alert(
        err instanceof Error
          ? `Couldn't delete account: ${err.message}`
          : 'Account deletion failed.',
      )
    }
    setMenuOpen(false)
    setConfirmDelete(false)
  }

  return (
    <div className={styles.wrap} ref={menuRef}>
      <button
        type="button"
        className={styles.chip}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        title={label}
      >
        <span aria-hidden className={styles.dot} />
        <span className={styles.email}>{label}</span>
      </button>

      {menuOpen && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={handleSignOut}
          >
            Sign out
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.danger}
            onClick={handleDelete}
          >
            {confirmDelete ? 'Tap again to confirm delete' : 'Delete account…'}
          </button>
        </div>
      )}
    </div>
  )
}
