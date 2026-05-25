import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BetaBanner } from './BetaBanner'

describe('BetaBanner', () => {
  beforeEach(() => localStorage.clear())

  it('explains that songs save locally during beta', () => {
    render(<BetaBanner />)
    expect(
      screen.getByText(/save on this device only/i),
    ).toBeInTheDocument()
  })

  it('links to the feedback form when a URL is provided', () => {
    render(<BetaBanner feedbackUrl="https://forms.example/x" />)
    const link = screen.getByRole('link', { name: /cloud save/i })
    expect(link).toHaveAttribute('href', 'https://forms.example/x')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows no feedback link until a URL is configured', () => {
    render(<BetaBanner feedbackUrl="" />)
    expect(screen.queryByRole('link', { name: /cloud save/i })).toBeNull()
  })

  it('dismisses when the close button is clicked', async () => {
    render(<BetaBanner />)
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(
      screen.queryByText(/save on this device only/i),
    ).not.toBeInTheDocument()
  })
})
