import { test, expect } from '@playwright/test';
import { createLoggedUser, authHeader } from './helpers/auth';
import { addItem, changeQuantity, getItem } from './helpers/basket';

const PRODUTO = 1;
const MAX_POR_PRODUTO = 5;

test.describe('Carrinho', () => {
  test('adicionar item devolve 200 e o item criado', async ({ request }) => {
    const user = await createLoggedUser(request);

    const res = await addItem(request, user, PRODUTO, 1);

    expect(res.status()).toBe(200);
    const { status, data } = await res.json();
    expect(status).toBe('success');
    expect(data.ProductId).toBe(PRODUTO);
    expect(data.BasketId).toBe(String(user.basketId));
    expect(data.quantity).toBe(1);
    expect(typeof data.id).toBe('number');
    expect(Date.parse(data.createdAt)).not.toBeNaN();
  });

  test('o carrinho do usuário pode ser consultado', async ({ request }) => {
    const user = await createLoggedUser(request);

    const res = await request.get(`/rest/basket/${user.basketId}`, {
      headers: authHeader(user.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data.id).toBe(user.basketId);
  });

  test('sem token o carrinho não é acessível', async ({ request }) => {
    const user = await createLoggedUser(request);

    const res = await request.get(`/rest/basket/${user.basketId}`);

    expect(res.status()).toBe(401);
  });

  test.describe('limite de unidades por produto', () => {
    for (const quantity of [1, MAX_POR_PRODUTO]) {
      test(`aceita quantidade ${quantity}`, async ({ request }) => {
        const user = await createLoggedUser(request);
        const created = await addItem(request, user, PRODUTO, 1);
        const itemId = (await created.json()).data.id;

        const res = await changeQuantity(request, user, itemId, quantity);

        expect(res.status()).toBe(200);
        const item = await (await getItem(request, user, itemId)).json();
        expect(item.data.quantity).toBe(quantity);
      });
    }

    test(`recusa quantidade ${MAX_POR_PRODUTO + 1}`, async ({ request }) => {
      const user = await createLoggedUser(request);
      const created = await addItem(request, user, PRODUTO, 1);
      const itemId = (await created.json()).data.id;
      await changeQuantity(request, user, itemId, MAX_POR_PRODUTO);

      const res = await changeQuantity(request, user, itemId, MAX_POR_PRODUTO + 1);

      expect(res.status()).toBe(400);
      const item = await (await getItem(request, user, itemId)).json();
      expect(item.data.quantity).toBe(MAX_POR_PRODUTO); // a quantidade não mudou
    });
  });

  test('cupom inexistente devolve 404', async ({ request }) => {
    const user = await createLoggedUser(request);

    const res = await request.put(`/rest/basket/${user.basketId}/coupon/cupom-que-nao-existe`, {
      headers: authHeader(user.token),
    });

    expect(res.status()).toBe(404);
  });
});