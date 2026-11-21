import { test, expect } from '@playwright/test';
import { createLoggedUser } from './helpers/auth';
import { addBalance, createCard, getBalance } from './helpers/wallet';

const MIN = 10;
const MAX = 1000;

test.describe('Carteira digital', () => {
  test('saldo inicial é zero', async ({ request }) => {
    const user = await createLoggedUser(request);

    expect(await getBalance(request, user)).toBe(0);
  });

  for (const valor of [MIN, MAX]) {
    test(`aceita adicionar ${valor} de saldo`, async ({ request }) => {
      const user = await createLoggedUser(request);
      const cartao = await createCard(request, user);

      const res = await addBalance(request, user, cartao, valor);

      expect(res.status()).toBe(200);
      expect(await getBalance(request, user)).toBe(valor);
    });
  }

  test('saldos adicionados se acumulam', async ({ request }) => {
    const user = await createLoggedUser(request);
    const cartao = await createCard(request, user);

    await addBalance(request, user, cartao, 10);
    await addBalance(request, user, cartao, 20);

    expect(await getBalance(request, user)).toBe(30);
  });

  // Na tela só dá para adicionar de 10 a 1000. Aqui testamos se a API
  // também recusa, ou se a regra existe só no formulário.
  for (const valor of [MIN - 1, MAX + 1, -MIN]) {
    test(`recusa adicionar ${valor} de saldo`, async ({ request }) => {
      test.fail(true, 'Bug conhecido (exploracao.md, #13): a API aceita valores fora de 10 a 1000; a regra só existe no formulário');
      const user = await createLoggedUser(request);
      const cartao = await createCard(request, user);

      const res = await addBalance(request, user, cartao, valor);

      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
      expect(await getBalance(request, user)).toBe(0);
    });
  }
});