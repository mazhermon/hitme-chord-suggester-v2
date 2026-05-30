import { BRAND, progressionBasename, videoFilename, videoFile } from './naming'

describe('progressionBasename', () => {
  it('slugifies a song name and prepends the brand', () => {
    expect(progressionBasename('My Cool Song')).toBe(`${BRAND}-my-cool-song`)
  })

  it('collapses runs of non-alphanumerics into one dash', () => {
    expect(progressionBasename('  hello!!  world??  ')).toBe(`${BRAND}-hello-world`)
  })

  it('strips leading and trailing dashes from the slug', () => {
    expect(progressionBasename('--foo--')).toBe(`${BRAND}-foo`)
  })

  it("returns `${BRAND}-untitled` when the name is missing or empty", () => {
    expect(progressionBasename()).toBe(`${BRAND}-untitled`)
    expect(progressionBasename(null)).toBe(`${BRAND}-untitled`)
    expect(progressionBasename('')).toBe(`${BRAND}-untitled`)
    expect(progressionBasename('!@#$%')).toBe(`${BRAND}-untitled`)
  })
})

function fakeBlob(type: string): Blob {
  // Tiny stand-in Blob; we only care about .type for naming.
  return new Blob(['x'], { type })
}

describe('videoFilename', () => {
  it('chooses .mp4 when the blob MIME contains mp4', () => {
    expect(videoFilename(fakeBlob('video/mp4'))).toBe(`${BRAND}.mp4`)
    expect(videoFilename(fakeBlob('video/mp4; codecs=avc1'))).toBe(
      `${BRAND}.mp4`,
    )
  })

  it('falls back to .webm for non-mp4 MIME types', () => {
    expect(videoFilename(fakeBlob('video/webm'))).toBe(`${BRAND}.webm`)
    expect(videoFilename(fakeBlob(''))).toBe(`${BRAND}.webm`)
  })

  it('uses the provided basename', () => {
    expect(videoFilename(fakeBlob('video/webm'), 'my-song')).toBe('my-song.webm')
  })
})

describe('videoFile', () => {
  it('wraps the blob in a named File with the right extension', () => {
    const file = videoFile(fakeBlob('video/mp4'), 'my-song')
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('my-song.mp4')
    expect(file.type).toBe('video/mp4')
  })

  it('defaults the basename to the brand', () => {
    const file = videoFile(fakeBlob('video/webm'))
    expect(file.name).toBe(`${BRAND}.webm`)
  })
})
