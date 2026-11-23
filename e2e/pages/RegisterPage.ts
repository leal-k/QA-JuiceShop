import { Page, expect } from '@playwright/test';

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async open() {
    // a lista de perguntas vem de uma chamada à API: criamos a espera ANTES de
    // abrir a página, senão a resposta pode chegar antes de começarmos a esperar
    const perguntasCarregadas = this.page.waitForResponse(
      (r) => r.url().includes('SecurityQuestions') && r.ok(),
    );
    await this.page.goto('/#/register');
    await perguntasCarregadas;
    await expect(this.page.getByRole('heading', { name: 'User Registration' })).toBeVisible();
  }

  async register(email: string, password: string, answer: string) {
    await this.page.getByRole('textbox', { name: 'Email address field' }).fill(email);
    await this.page.getByRole('textbox', { name: 'Field for the password', exact: true }).fill(password);
    await this.page.getByRole('textbox', { name: 'Field to confirm the password' }).fill(password);

    await this.selecionarPrimeiraPergunta();

    await this.page
      .getByRole('textbox', { name: 'Field for the answer to the security question' })
      .fill(answer);

    // Se algum campo não ficou válido, o botão continua desabilitado e o erro diz isso.
    const registrar = this.page.getByRole('button', { name: 'Button to complete the registration' });
    await expect(registrar).toBeEnabled();
    await registrar.click();
  }

  private async selecionarPrimeiraPergunta() {
    const pergunta = this.page.getByRole('combobox', {
      name: 'Selection list for the security question',
    });
    // O rótulo "Security Question" cobre o campo e intercepta o clique,
    // então clicamos nele, como uma pessoa faz.
    const rotulo = this.page.locator('mat-label', { hasText: 'Security Question' });

    // Repete até a lista estar aberta. Só clica se ela estiver fechada, para não
    // fechar uma lista que abriu com atraso.
    await expect(async () => {
      if ((await pergunta.getAttribute('aria-expanded')) !== 'true') {
        await rotulo.click({ timeout: 2000 });
      }
      await expect(pergunta).toHaveAttribute('aria-expanded', 'true', { timeout: 1500 });
    }).toPass({ timeout: 10_000 });

    await this.page.getByRole('option').first().click();
  }
}