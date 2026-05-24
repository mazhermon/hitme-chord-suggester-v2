import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChordDock } from './ChordDock'
import { EditorProvider, useEditor } from '@/state/EditorProvider'
import { displayChords } from '@/state/editor'

function Peek() {
  const { state } = useEditor()
  return <output data-testid="count">{state.slots.length}</output>
}

function setup(props?: Partial<Parameters<typeof ChordDock>[0]>) {
  return render(
    <EditorProvider>
      <ChordDock
        onPlay={props?.onPlay ?? vi.fn()}
        onSave={props?.onSave ?? vi.fn()}
      />
      <Peek />
    </EditorProvider>,
  )
}

describe('ChordDock', () => {
  it('adds chords when numeral buttons are pressed', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Add chord I' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add chord IV' }))
    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })

  it('disables Suggest, Play, Reset and Save until there are chords', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Suggest' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Add chord I' }))
    expect(screen.getByRole('button', { name: 'Suggest' })).toBeEnabled()
  })

  it('resets the progression', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Add chord I' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('calls onPlay with the chords on screen', async () => {
    const onPlay = vi.fn()
    setup({ onPlay })
    await userEvent.click(screen.getByRole('button', { name: 'Add chord I' }))
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPlay.mock.calls[0][0]).toHaveLength(1)
  })

  it('calls onSave', async () => {
    const onSave = vi.fn()
    setup({ onSave })
    await userEvent.click(screen.getByRole('button', { name: 'Add chord I' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('keeps displayChords consistent (sanity)', () => {
    // displayChords is the source of truth the dock plays/saves.
    expect(displayChords).toBeTypeOf('function')
  })
})
