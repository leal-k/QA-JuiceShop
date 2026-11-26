import { test, expect } from '@playwright/test';
import { createUser, login, PASSWORD } from './helpers/auth';
import { randomUUID } from 'crypto';

test.describe('Cadastro e login', () => {
  test('cadastro cria usuário customer sem expor a senha', async ({ request }) => {
    const email = `qa-${randomUUID()}@example.com`;
    const res = await request.post('/api/Users/', {
      data: {
        email,
        password: PASSWORD,
        passwordRepeat: PASSWORD,
        securityQuestion: { id: 1, question: 'Your eldest siblings middle name?' },
        securityAnswer: 'teste',
      },
    });

    expect(res.status()).toBe(201); // ajuste para o status que você viu no DevTools
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data.email).toBe(email);
    expect(body.data.role).toBe('customer');
    expect(body.data.isActive).toBe(true);
    expect(typeof body.data.id).toBe('number');
    expect(body.data).not.toHaveProperty('password');
  });

  test('login válido devolve token e id do carrinho', { tag: '@smoke' }, async ({ request }) => {
    const { email } = await createUser(request);

    const res = await request.post('/rest/user/login', {
      data: { email, password: PASSWORD },
    });

    expect(res.status()).toBe(200);
    const { authentication } = await res.json();
    expect(authentication.umail).toBe(email);
    expect(typeof authentication.token).toBe('string');
    expect(typeof authentication.bid).toBe('number');
  });

  test('login com senha errada é recusado', async ({ request }) => {
    const { email } = await createUser(request);

    const res = await request.post('/rest/user/login', {
      data: { email, password: 'senha-errada' },
    });

    expect(res.status()).toBe(401);
  });
});