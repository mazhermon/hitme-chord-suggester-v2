import { test, expect } from '@playwright/test'

/**
 * Visual regression baselines for the key editor states.
 *
 * Run with `npm run e2e:visual` to compare; `npm run e2e:visual:update`
 * regenerates baselines after an intentional design change.
 *
 * Note: font rendering varies between macOS / Linux / CI runners. Baselines
 * committed here are captured on the developer's machine; CI VR comparison
 * needs a containerised browser or per-OS baselines (deferred — see
 * docs/NEXT-STEPS.md).
 */

const SMALL = { width: 360, height: 800 }
const TABLET = { width: 768, height: 900 }
const DESKTOP = { width: 1280, height: 900 }

// Wait long enough for next/font + the GSAP intro fade to settle before
// snapping. Cuts flake when fonts swap or animations finish mid-screenshot.
async function settle(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

test.describe('editor — empty state', () => {
  for (const viewport of [SMALL, TABLET, DESKTOP]) {
    test(`@${viewport.width} renders the intro`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await settle(page)
      await expect(page).toHaveScreenshot(`editor-empty-${viewport.width}.png`, {
        animations: 'disabled',
        // Allow tiny anti-alias / sub-pixel differences from font hinting.
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})

test.describe('editor — with chords (I, IV, V, VI in C major Jazz)', () => {
  for (const viewport of [SMALL, TABLET, DESKTOP]) {
    test(`@${viewport.width} renders the chord display`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await settle(page)
      for (const numeral of ['I', 'IV', 'V', 'VI']) {
        await page.getByRole('button', { name: `Add chord ${numeral}`, exact: true }).click()
      }
      await page.waitForTimeout(200) // animation settle
      await expect(page).toHaveScreenshot(`editor-chords-${viewport.width}.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})

test.describe('drawer / sidebar', () => {
  test('@360 overlay drawer open', async ({ page }) => {
    await page.setViewportSize(SMALL)
    await page.goto('/')
    await settle(page)
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.waitForTimeout(400) // drawer transform settle
    await expect(page).toHaveScreenshot('drawer-open-360.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    })
  })

  test('@1280 docked sidebar', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')
    await settle(page)
    await expect(page).toHaveScreenshot('sidebar-docked-1280.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    })
  })
})

test.describe('songs list', () => {
  for (const viewport of [SMALL, DESKTOP]) {
    test(`@${viewport.width} empty list`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/songs')
      await settle(page)
      await expect(page).toHaveScreenshot(`songs-${viewport.width}.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})
