import { render, screen } from '@testing-library/react'
import { ChordDiagram } from './ChordDiagram'

describe('ChordDiagram', () => {
  it('marks muted and open strings', () => {
    // x32010 — low E muted; G and high e open
    render(<ChordDiagram frets={[null, 3, 2, 0, 1, 0]} baseFret={1} />)
    expect(screen.getAllByText('×')).toHaveLength(1)
    expect(screen.getAllByText('○')).toHaveLength(2)
  })

  it('shows a position label when not in open position', () => {
    render(<ChordDiagram frets={[8, 10, 9, 9, 8, 8]} baseFret={8} />)
    expect(screen.getByText('8fr')).toBeInTheDocument()
  })

  it('renders an accessible svg with a label', () => {
    render(<ChordDiagram frets={[null, 3, 2, 0, 1, 0]} baseFret={1} name="C" />)
    expect(
      screen.getByRole('img', { name: /C guitar chord/i }),
    ).toBeInTheDocument()
  })
})
