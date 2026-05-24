import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChordDisplay } from './ChordDisplay'
import { realizeChord } from '@/lib/theory/chords'
import type { KeyContext } from '@/lib/theory/types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }
const chords = [realizeChord(0, cMajor), realizeChord(4, cMajor)] // Cmaj7, G7

describe('ChordDisplay', () => {
  it('renders each chord as a numeral, root, quality and source', () => {
    render(<ChordDisplay chords={chords} />)
    expect(screen.getByText('I')).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
    expect(screen.getAllByText('diatonic')).toHaveLength(2)
  })

  it('plays a chord when its cluster is clicked', async () => {
    const onChordClick = vi.fn()
    render(<ChordDisplay chords={chords} onChordClick={onChordClick} />)
    await userEvent.click(screen.getByRole('button', { name: /Cmaj7/ }))
    expect(onChordClick).toHaveBeenCalledWith(chords[0], 0)
  })

  it('shows a remove control when removable', async () => {
    const onRemove = vi.fn()
    render(<ChordDisplay chords={chords} removable onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: /Remove Cmaj7/ }))
    expect(onRemove).toHaveBeenCalledWith(0)
  })
})
