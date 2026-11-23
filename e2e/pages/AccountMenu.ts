import { Page } from '@playwright/test';

export class AccountMenu {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.getByRole('button', { name: 'Show/hide account menu' }).click();
  }

  async goToDataErasure() {
    await this.open();
    // os nomes abaixo são os nomes acessíveis (aria-label), não o texto que aparece na tela
    await this.page.getByRole('menuitem', { name: 'Show Privacy and Security Menu' }).click();
    await this.page.getByRole('menuitem', { name: 'Go to data subject page' }).click();
  }
}