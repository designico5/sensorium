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

  for (const workspace of [
    'Perform', 'Sections', 'Mix', 'Macros', 'Visual', 'Mindmap', 'Acoustic',
    '5D Stage', 'Instinct', 'Production', 'Live Tools', 'AI', 'System',
  ]) {
    await page.getByRole('button', { name: `${workspace} workspace` }).click();
    const workspaceAccessibility = await new AxeBuilder({ page }).analyze();
    expect(workspaceAccessibility.violations, `${workspace} accessibility`).toEqual([]);
  }
});
