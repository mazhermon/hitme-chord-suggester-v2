import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoModal } from './VideoModal'
import { track } from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

beforeAll(() => {
  // jsdom has no object URLs.
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = vi.fn()
})

const makeBlob = () => new Blob(['x'], { type: 'video/mp4' })

describe('VideoModal', () => {
  it('renders nothing without a video', () => {
    const { container } = render(<VideoModal blob={null} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('previews the recorded clip', () => {
    render(<VideoModal blob={makeBlob()} onClose={() => {}} />)
    expect(screen.getByTestId('video-preview')).toBeInTheDocument()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('offers a download link and the social platforms', () => {
    render(<VideoModal blob={makeBlob()} onClose={() => {}} />)
    // A real anchor (not a scripted click) so embedded browsers don't block it.
    expect(screen.getByRole('link', { name: /^download$/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /open in a new tab/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tiktok/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /instagram/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /facebook/i }),
    ).toBeInTheDocument()
  })

  it('closes via the close button', async () => {
    const onClose = vi.fn()
    render(<VideoModal blob={makeBlob()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('VideoModal — coming soon + interest tracking', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows a coming-soon note and tracks the platform click', async () => {
    render(<VideoModal blob={makeBlob()} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /tiktok/i }))

    expect(track).toHaveBeenCalledWith('share_intent', { platform: 'TikTok' })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/coming soon/i)
    expect(status).toHaveTextContent(/tiktok/i)
  })

  it('tracks Instagram and Facebook intents distinctly', async () => {
    render(<VideoModal blob={makeBlob()} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /instagram/i }))
    expect(track).toHaveBeenCalledWith('share_intent', { platform: 'Instagram' })
    await userEvent.click(screen.getByRole('button', { name: /facebook/i }))
    expect(track).toHaveBeenCalledWith('share_intent', { platform: 'Facebook' })
  })
})
