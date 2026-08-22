import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('stage boundary is fail-closed and demo entry is keyboard reachable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Keine Simulation im Stage-Modus.' })).toBeVisible();
  await expect(page.getByText('AUSGÄNGE GESPERRT')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Hardware-Tests und Stage-Abnahme stehen noch aus.');

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  const demoButton = page.getByRole('button', { name: /DEMO STARTEN/ });
  await demoButton.focus();
  await expect(demoButton).toBeFocused();
  await demoButton.press('Enter');

  await expect(page.getByRole('navigation', { name: 'Performance workspaces' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pause show|Play show/ })).toBeVisible();
});
