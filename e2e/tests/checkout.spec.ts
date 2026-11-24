import { test as base, expect } from '../fixtures';
import { createLoggedUser } from '../../api/helpers/auth';
import { addItem } from '../../api/helpers/basket';
import { createCard } from '../../api/helpers/wallet';
import { createAddress } from '../../api/helpers/address';
import { iniciarSessao } from '../helpers/session';
import { BasketPage } from '../pages/BasketPage';
import { CheckoutPage } from '../pages/CheckoutPage';

// Fixture: antes de cada teste, prepara pela API usuário, item (Apple Juice, 1.99¤),
// cartão e endereço, e deixa o navegador logado. O teste só cuida do que importa.
const test = base.extend<{ compra: { cesta: BasketPage; checkout: CheckoutPage } }>({
  compra: async ({ page, request, context, baseURL }, use) => {
    const user = await createLoggedUser(request);
    await addItem(request, user, 1, 1);
    await createCard(request, user);
    await createAddress(request, user);
    await iniciarSessao(context, baseURL!, user);
    await use({ cesta: new BasketPage(page), checkout: new CheckoutPage(page) });
  },
});

test.describe('Checkout', () => {
  test('compra completa: carrinho, endereço, entrega, pagamento e pedido', async ({ page, compra }) => {
    const { cesta, checkout } = compra;

    await cesta.open();
    await cesta.expectItem('Apple Juice (1000ml)');
    await cesta.startCheckout();
    await checkout.chooseAddress('Rua dos Testes');
    await checkout.chooseDelivery('One Day Delivery');
    await checkout.chooseCard('1111');
    await checkout.expectSummary({ items: '1.99¤', delivery: '0.99¤', total: '2.98¤' });
    await checkout.placeOrder();

    await expect(page).toHaveURL(/order-completion/); // suposição minha, ver abaixo
  });

  const entregas = [
    { nome: 'One Day Delivery', frete: '0.99¤', total: '2.98¤' },
    { nome: 'Fast Delivery', frete: '0.50¤', total: '2.49¤' },
    { nome: 'Standard Delivery', frete: '0.00¤', total: '1.99¤' },
  ];

  for (const entrega of entregas) {
    test(`o frete "${entrega.nome}" entra no total do pedido`, async ({ compra }) => {
      const { cesta, checkout } = compra;

      await cesta.open();
      await cesta.startCheckout();
      await checkout.chooseAddress('Rua dos Testes');
      await checkout.chooseDelivery(entrega.nome);
      await checkout.chooseCard('1111');

      await checkout.expectSummary({ items: '1.99¤', delivery: entrega.frete, total: entrega.total });
    });
  }
});