import { expect, test } from '@playwright/test';

const targetViewports = [
  { name: 'full-hd', width: 1920, height: 1080 },
  { name: '4k', width: 3840, height: 2160 },
  { name: '8k', width: 7680, height: 4320 },
];

test.describe('visual layout regression guard', () => {
  for (const viewport of targetViewports) {
    test(`${viewport.name} keeps stage canvas inside the viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.getByRole('button', { name: /DEMO STARTEN/ }).click();
      await page.getByRole('navigation', { name: 'Performance workspaces' }).waitFor();
      await page.evaluate(async () => document.fonts?.ready);

      const layout = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
      }));
      expect(layout.documentWidth, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.documentHeight, `${viewport.name} vertical overflow`).toBeLessThanOrEqual(layout.viewportHeight + 1);

      const screenshot = await page.screenshot({ animations: 'disabled', fullPage: false });
      expect(screenshot.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(screenshot.byteLength, `${viewport.name} screenshot capture`).toBeGreaterThan(1_000);
    });
  }
});
