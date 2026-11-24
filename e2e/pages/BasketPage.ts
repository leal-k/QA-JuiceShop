import { Page, expect } from '@playwright/test';

export class BasketPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/#/basket');
    await expect(this.page.getByRole('heading', { name: /Your Basket/ })).toBeVisible();
  }

  async expectItem(nome: string) {
    await expect(this.page.getByRole('row', { name: nome })).toBeVisible();
  }

  async startCheckout() {
    await this.page.getByRole('button', { name: 'Checkout' }).click();
    await expect(this.page).toHaveURL(/#\/address\/select/);
  }
}