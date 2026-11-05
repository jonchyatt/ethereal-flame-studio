import { expect, test } from 'playwright/test';

test('signs up from the front door at phone size and shows the row to the operator', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const signup = page.locator('form[data-email-signup]');
  await signup.locator('input[name="email"]').fill('front-door@example.test');
  await signup.getByRole('button', { name: 'Tell me when' }).click();
  await expect(signup.getByRole('status')).toContainText('Thanks — you’re on the list.');

  await page.goto('/operator/subscribers');
  await expect(page.getByRole('heading', { name: 'Email subscribers' })).toBeVisible();
  await expect(page.getByText('front-door@example.test')).toBeVisible();
  const downloadPromise = page.waitForEvent('download', { timeout: 5_000 });
  await page.getByRole('link', { name: 'Download CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('waia-subscribers.csv');
});

test('signs up from the store at desktop size', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/store');
  const signup = page.locator('[data-email-signup]');
  await signup.locator('input[name="email"]').fill('store@example.test');
  await signup.getByRole('button', { name: 'Tell me when' }).click();
  await expect(signup.getByRole('status')).toContainText('Thanks — you’re on the list.');

  await page.goto('/operator/subscribers');
  await expect(page.getByText('store@example.test')).toBeVisible();
});
