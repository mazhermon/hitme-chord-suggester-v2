import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChordDisplay } from './ChordDisplay'
import { realizeChord } from '@/lib/theory/chords'
import { flagsFromLevel } from '@/lib/theory/extensions'
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

  it('swaps a chord via its swap control', async () => {
    const onSwap = vi.fn()
    render(<ChordDisplay chords={chords} onSwap={onSwap} />)
    await userEvent.click(screen.getByRole('button', { name: /Swap Cmaj7/ }))
    expect(onSwap).toHaveBeenCalledWith(0)
  })

  it('opens a lesson when the source label is clicked', async () => {
    const onShowLesson = vi.fn()
    render(<ChordDisplay chords={chords} onShowLesson={onShowLesson} />)
    await userEvent.click(
      screen.getAllByRole('button', { name: /About diatonic/i })[0],
    )
    expect(onShowLesson).toHaveBeenCalledWith('diatonic')
  })

  it('plays a chord via its play control', async () => {
    const onPlay = vi.fn()
    render(<ChordDisplay chords={chords} onPlay={onPlay} />)
    await userEvent.click(screen.getByRole('button', { name: /Play Cmaj7/ }))
    expect(onPlay).toHaveBeenCalledWith(chords[0], 0)
  })

  it('toggles a lock on a chord', async () => {
    const onToggleLock = vi.fn()
    render(
      <ChordDisplay
        chords={chords}
        locked={[false, false]}
        onToggleLock={onToggleLock}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Lock Cmaj7/ }))
    expect(onToggleLock).toHaveBeenCalledWith(0)
  })

  it('toggles a per-chord extension (9th independently)', async () => {
    const onToggleExtension = vi.fn()
    render(
      <ChordDisplay chords={chords} onToggleExtension={onToggleExtension} />,
    )
    // default = 7th on, 9th off → the 9 chip says "Add 9th on Cmaj7"
    await userEvent.click(
      screen.getByRole('button', { name: 'Add 9th on Cmaj7' }),
    )
    expect(onToggleExtension).toHaveBeenCalledWith(0, 'ninth')
  })

  it('reverts a substituted chord', async () => {
    const onRevert = vi.fn()
    render(
      <ChordDisplay
        chords={chords}
        substituted={[true, false]}
        onRevert={onRevert}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Revert Cmaj7/ }))
    expect(onRevert).toHaveBeenCalledWith(0)
  })

  it('shows a remove control when removable', async () => {
    const onRemove = vi.fn()
    render(<ChordDisplay chords={chords} removable onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: /Remove Cmaj7/ }))
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('renders chord symbols at the given extension level', () => {
    render(
      <ChordDisplay
        chords={[realizeChord(0, cMajor)]}
        extensions={[flagsFromLevel('ninth')]}
      />,
    )
    expect(screen.getByText('maj9')).toBeInTheDocument() // Cmaj7 → Cmaj9
  })

  it('cycles a chord voicing via its voicing control', async () => {
    const onCycleVoicing = vi.fn()
    render(<ChordDisplay chords={chords} onCycleVoicing={onCycleVoicing} />)
    await userEvent.click(
      screen.getByRole('button', { name: /voicing of Cmaj7/i }),
    )
    expect(onCycleVoicing).toHaveBeenCalledWith(0)
  })
})
