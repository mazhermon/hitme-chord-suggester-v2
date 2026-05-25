import { progressionBasename, videoFilename } from './record'

describe('progressionBasename', () => {
  it('uses an -untitled suffix when the song is unsaved', () => {
    expect(progressionBasename()).toBe('hitme-progression-untitled')
    expect(progressionBasename(null)).toBe('hitme-progression-untitled')
    expect(progressionBasename('')).toBe('hitme-progression-untitled')
    expect(progressionBasename('   ')).toBe('hitme-progression-untitled')
  })

  it('keeps the brand and appends a slug of the song name', () => {
    expect(progressionBasename('My Cool Song')).toBe(
      'hitme-progression-my-cool-song',
    )
    expect(progressionBasename('A/B Test!! ')).toBe(
      'hitme-progression-a-b-test',
    )
  })
})

describe('videoFilename', () => {
  it('adds the right extension for the blob type', () => {
    const mp4 = new Blob([], { type: 'video/mp4' })
    const webm = new Blob([], { type: 'video/webm' })
    expect(videoFilename(mp4, 'hitme-progression-untitled')).toBe(
      'hitme-progression-untitled.mp4',
    )
    expect(videoFilename(webm, 'hitme-progression-my-song')).toBe(
      'hitme-progression-my-song.webm',
    )
  })
})
