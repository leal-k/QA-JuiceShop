import { Page, expect } from '@playwright/test';

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  // O botão de rádio real fica coberto pelo círculo estilizado do Angular Material,
  // por isso o clique é forçado: ele vai para o mesmo ponto que uma pessoa clicaria.
  private async marcarLinha(nomeDaLinha: string) {
    await this.page.getByRole('row', { name: nomeDaLinha }).getByRole('radio').click({ force: true });
  }

  async chooseAddress(trechoDoEndereco: string) {
    await this.marcarLinha(trechoDoEndereco);
    // O nome acessível deste botão diz "payment selection", mas ele leva à entrega (BUG #18).
    await this.page.getByRole('button', { name: 'Proceed to payment selection' }).click();
    await expect(this.page).toHaveURL(/#\/delivery-method/);
  }

  async chooseDelivery(velocidade: string) {
    await this.marcarLinha(velocidade);
    // O nome acessível deste botão diz "delivery method selection", mas ele leva ao pagamento (BUG #18).
    await this.page.getByRole('button', { name: 'Proceed to delivery method selection' }).click();
    await expect(this.page).toHaveURL(/#\/payment\/shop/);
  }

  async chooseCard(finalDoCartao: string) {
    await this.marcarLinha(finalDoCartao);
    await this.page.getByRole('button', { name: 'Proceed to review' }).click();
    await expect(this.page).toHaveURL(/#\/order-summary/);
  }

  async expectSummary(valores: { items: string; delivery: string; total: string }) {
    const celula = (rotulo: string) =>
      this.page.getByRole('row', { name: rotulo }).getByRole('cell').last();
    await expect(celula('Items')).toHaveText(valores.items);
    await expect(celula('Delivery')).toHaveText(valores.delivery);
    await expect(celula('Total Price')).toHaveText(valores.total);
  }

  async placeOrder() {
    // Na tela aparece "Place your order and pay", mas o nome acessível é outro.
    await this.page.getByRole('button', { name: 'Complete your purchase' }).click();
  }
}