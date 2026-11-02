const { test, expect } = require('@playwright/test');

test.describe('App shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('navigates between routes (React Router)', async ({ page }) => {
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  });

  test('shows 404 for unknown routes', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});