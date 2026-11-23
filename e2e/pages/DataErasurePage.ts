import { Page, expect } from '@playwright/test';

export class DataErasurePage {
  constructor(private readonly page: Page) {}

  async expectOpen() {
    await expect(this.page).toHaveURL(/\/dataerasure/);
    await expect(
      this.page.getByRole('heading', { name: 'Data Erasure Request (Art. 17 GDPR)' }),
    ).toBeVisible();
  }

  async requestErasure(email: string, answer: string) {
    await this.page.getByRole('textbox', { name: 'Confirm Email Address' }).fill(email);
    await this.page.getByRole('textbox', { name: 'Answer', exact: true }).fill(answer);
    await this.page.getByRole('button', { name: /Delete User Data/ }).click();
  }

  confirmationMessage() {
    return this.page.getByText('Your erasure request will be processed shortly.');
  }

  async goToHomePage() {
    await this.page.getByRole('link', { name: 'Go To HomePage' }).click();
  }
}