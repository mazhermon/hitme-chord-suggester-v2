/**
 * Lightweight, provider-agnostic event tracking.
 *
 * It forwards to whatever analytics queue is on the page. Vercel Web Analytics
 * (free on Hobby) exposes `window.va` and is the intended provider — once its
 * script/`<Analytics/>` is added on deploy, these events flow with no code
 * change. Until then this is a safe no-op, so we can instrument now and measure
 * later. See docs/roadmap for the demand-checking plan.
 */
type TrackProps = Record<string, string | number | boolean>
type VaQueue = (event: 'event', props: { name: string } & TrackProps) => void

export function track(name: string, props: TrackProps = {}): void {
  if (typeof window === 'undefined') return
  const va = (window as unknown as { va?: VaQueue }).va
  va?.('event', { name, ...props })
}
