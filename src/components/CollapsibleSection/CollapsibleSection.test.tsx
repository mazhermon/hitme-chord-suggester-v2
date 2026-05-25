import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollapsibleSection } from './CollapsibleSection'

describe('CollapsibleSection', () => {
  beforeEach(() => localStorage.clear())

  it('hides its content until the heading is toggled', async () => {
    render(
      <CollapsibleSection title="Sound">
        <p>inside</p>
      </CollapsibleSection>,
    )
    const toggle = screen.getByRole('button', { name: /sound/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('inside')).toBeNull()

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('inside')).toBeInTheDocument()
  })

  it('can start open', () => {
    render(
      <CollapsibleSection title="Chords" defaultOpen>
        <p>inside</p>
      </CollapsibleSection>,
    )
    expect(screen.getByText('inside')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /chords/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
