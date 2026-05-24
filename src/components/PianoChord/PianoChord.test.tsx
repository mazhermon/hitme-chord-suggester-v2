import { render, screen } from '@testing-library/react'
import { PianoChord } from './PianoChord'

describe('PianoChord', () => {
  it('renders an accessible keyboard and highlights the chord tones', () => {
    const { container } = render(
      <PianoChord notes={[60, 64, 67]} name="C" />, // C major
    )
    expect(screen.getByRole('img', { name: /C piano/i })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-on="chord"]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-on="active"]')).toHaveLength(0)
  })

  it('marks the currently sounding note distinctly', () => {
    const { container } = render(
      <PianoChord notes={[60, 64, 67]} active={[64]} name="C" />,
    )
    expect(container.querySelectorAll('[data-on="active"]')).toHaveLength(1)
    // the sounding note is no longer just a chord tone
    expect(container.querySelectorAll('[data-on="chord"]')).toHaveLength(2)
  })
})
