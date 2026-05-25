'use client'

import { useEffect, useRef, useState } from 'react'
import { videoFilename } from '@/lib/video/record'
import { track } from '@/lib/analytics'
import styles from './VideoModal.module.css'

type Platform = 'TikTok' | 'Instagram' | 'Facebook'

interface VideoModalProps {
  blob: Blob | null
  /** Base filename (no extension), e.g. `hitme-progression-untitled`. */
  basename?: string
  onClose: () => void
}

export function VideoModal({
  blob,
  basename = 'hitme-progression',
  onClose,
}: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const downloadRef = useRef<HTMLAnchorElement>(null)
  const newTabRef = useRef<HTMLAnchorElement>(null)
  const [comingSoon, setComingSoon] = useState<Platform | null>(null)

  // Clear any prior "coming soon" note when a fresh video is opened. Deferred to
  // a timeout so we never set state synchronously inside an effect.
  useEffect(() => {
    const id = setTimeout(() => setComingSoon(null), 0)
    return () => clearTimeout(id)
  }, [blob])

  // Wire the object URL onto the <video> and the real <a> links from inside an
  // effect (never during render). Real anchors — clicked by the user — are far
  // more reliable than a synthetic click, which embedded/preview browsers block.
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    if (videoRef.current) videoRef.current.src = url
    if (downloadRef.current) {
      downloadRef.current.href = url
      downloadRef.current.download = videoFilename(blob, basename)
    }
    if (newTabRef.current) newTabRef.current.href = url
    return () => URL.revokeObjectURL(url)
  }, [blob, basename])

  // Escape to close, focus the primary action, trap Tab, restore focus on close.
  useEffect(() => {
    if (!blob) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable =
        dialogRef.current.querySelectorAll<HTMLElement>('button, a, video')
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
  }, [blob, onClose])

  if (!blob) return null

  // Direct posting isn't built yet — record the interest (so we can see which
  // platforms people want) and nudge them to download + post manually for now.
  function onPlatform(platform: Platform) {
    track('share_intent', { platform })
    setComingSoon(platform)
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="video-modal-title" className={styles.title}>
          Your video
        </h2>

        <video
          ref={videoRef}
          data-testid="video-preview"
          className={styles.video}
          controls
          autoPlay
          loop
          playsInline
          aria-label="Preview of your chord progression video"
        />

        <div className={styles.actions}>
          {/* Real download link (href set in the effect) — works where a
              scripted download is blocked. */}
          <a ref={downloadRef} className={styles.downloadBtn} download>
            Download
          </a>
        </div>

        <p className={styles.fallback}>
          Not in your downloads?{' '}
          <a
            ref={newTabRef}
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in a new tab
          </a>{' '}
          (then save it), or right-click / long-press the video above.
        </p>

        <p className={styles.kicker}>Share to</p>
        <div className={styles.platformsPrimary}>
          <button
            type="button"
            className={`${styles.platform} ${styles.tiktok}`}
            onClick={() => onPlatform('TikTok')}
          >
            TikTok
          </button>
          <button
            type="button"
            className={`${styles.platform} ${styles.instagram}`}
            onClick={() => onPlatform('Instagram')}
          >
            Instagram
          </button>
        </div>
        <div className={styles.platformsSecondary}>
          <button
            type="button"
            className={styles.platformSmall}
            onClick={() => onPlatform('Facebook')}
          >
            Also share to Facebook
          </button>
        </div>

        {comingSoon ? (
          <p className={styles.comingSoon} role="status">
            🚧 One-tap posting to <strong>{comingSoon}</strong> is coming soon —
            thanks for the interest! For now, hit <strong>Download</strong> above
            and post it in the {comingSoon} app.
          </p>
        ) : (
          <p className={styles.note}>
            Direct posting is on the way. For now, download your video and upload
            it in your favourite app.
          </p>
        )}
      </div>
    </div>
  )
}
