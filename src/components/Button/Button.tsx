'use client'

import type { ButtonHTMLAttributes, Ref } from 'react'
import styles from './Button.module.css'

type Variant = 'pill' | 'primary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  // React 19 lets us accept `ref` as a regular prop on function components.
  ref?: Ref<HTMLButtonElement>
}

/** The cream pill button from the legacy app, with an animated focus ring. */
export function Button({
  variant = 'pill',
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const cls = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ')
  return (
    <button ref={ref} className={cls} {...rest}>
      <span className={styles.inner}>{children}</span>
    </button>
  )
}
