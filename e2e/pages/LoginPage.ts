import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/#/login');
    await expect(this.page.getByRole('heading', { name: 'Login' })).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Text field for the login email' }).fill(email);
    await this.page.getByRole('textbox', { name: 'Text field for the login password' }).fill(password);
    // exact: true, porque também existe o botão "Login with Google"
    await this.page.getByRole('button', { name: 'Login', exact: true }).click();
  }
}