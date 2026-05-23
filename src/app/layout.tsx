import type { Metadata, Viewport } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import './globals.css'

// Sans for UI; serif (Playfair Display) stands in for the legacy Typekit "miller-banner".
const sans = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const serif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hit me — chord suggester',
  description:
    'A songwriting tool: build a chord progression and swap chords for theory-correct substitutions.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#83a085',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
