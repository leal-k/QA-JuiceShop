import { test, expect } from '../fixtures';

test('a página inicial carrega', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Juice Shop/);
});