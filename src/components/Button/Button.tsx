'use client'

import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type Variant = 'pill' | 'primary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/** The cream pill button from the legacy app, with an animated focus ring. */
export function Button({
  variant = 'pill',
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} {...rest}>
      <span className={styles.inner}>{children}</span>
    </button>
  )
}
