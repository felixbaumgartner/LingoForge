import { expect, test } from '@playwright/test';

test('mission goals select useful stories and follow the chosen language', async ({ page }) => {
  await page.goto('/e2e/harness.html?path=/missions/spanish');
  await expect(page.getByRole('link', { name: 'Start mission', exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: 'Meet people', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Start mission', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Start a friendly conversation' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Mission language' }).selectOption('dutch');
  await expect(page.getByRole('combobox', { name: 'Mission language' })).toHaveValue('dutch');
  await expect(page.getByRole('link', { name: 'Start mission', exact: true })).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Start mission', exact: true }).first()).toHaveAttribute('href', /\/missions\/dutch\/dutch-/);
  await page.getByRole('combobox', { name: 'Mission language' }).selectOption('spanish');
  await expect(page.getByRole('button', { name: 'Meet people', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('listening mistake needs audio and assisted reading cannot erase the difficulty', async ({ page }) => {
  await page.goto('/e2e/harness.html?scenario=mission-mistakes&path=/missions/spanish/clinic');
  await expect(page.getByText('Listening focus', { exact: false })).toBeVisible();
  await page.getByRole('radio', { name: 'With milk, please.', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Check phrase', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Audio unavailable? Read instead (assisted)', exact: true }).click();
  await page.getByRole('button', { name: 'Check phrase', exact: true }).click();
  const snapshot = await page.evaluate(() => window.__lingoforgeTest.snapshot().learningJournal);
  const attempt = Object.values(snapshot.attempts).find((event) => event.id !== 'seed-error');
  expect(attempt).toMatchObject({ ability: 'listening', assisted: true, correct: true });
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
  await page.getByRole('status').getByRole('link', { name: 'Back to missions', exact: true }).click();
  await expect(page.getByText('1 phrase patterns could use focused practice.', { exact: false })).toBeVisible();
});
