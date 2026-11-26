import { test, expect } from '../fixtures';

test('a página inicial carrega', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Juice Shop/);
});