import { test, expect } from '@playwright/test';
import { createLoggedUser, authHeader } from './helpers/auth';

test.describe('Tratamento de erros', () => {
  test('JSON mal formado deveria devolver 400, sem expor a stack trace', async ({ request }) => {
    test.fail(true, 'Bug conhecido (exploracao.md, #14): o erro vira 500 com stack trace e caminhos internos');
    const user = await createLoggedUser(request);

    const res = await request.put('/rest/wallet/balance', {
      headers: { ...authHeader(user.token), 'Content-Type': 'application/json' },
      data: '{"balance":10,"paymentId":}', // texto cru, JSON inválido de propósito
    });

    expect(res.status()).toBe(400);
    expect(await res.text()).not.toContain('/juice-shop/');
  });
});