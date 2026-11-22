import { test, expect, APIRequestContext } from '@playwright/test';
import { createLoggedUser, authHeader, login, PASSWORD } from './helpers/auth';

const NOVA_SENHA = 'NovaSenha@678';

function changePassword(
  request: APIRequestContext,
  token: string,
  current: string,
  next: string,
  repeat: string = next,
) {
  return request.get('/rest/user/change-password', {
    headers: authHeader(token),
    params: { current, new: next, repeat },
  });
}

function rawLogin(request: APIRequestContext, email: string, password: string) {
  return request.post('/rest/user/login', { data: { email, password } });
}

test.describe('Conta do usuário', () => {
  test('troca de senha com os dados corretos', async ({ request }) => {
    const user = await createLoggedUser(request);

    const res = await changePassword(request, user.token, PASSWORD, NOVA_SENHA);

    expect(res.status()).toBe(200);
    await login(request, user.email, NOVA_SENHA); // a senha nova funciona
    const antiga = await rawLogin(request, user.email, PASSWORD);
    expect(antiga.status()).toBe(401); // a antiga não funciona mais
  });

  test('senha atual errada é recusada e a senha não muda', async ({ request }) => {
    const user = await createLoggedUser(request);

    const res = await changePassword(request, user.token, 'senha-errada', NOVA_SENHA);

    expect([400, 401]).toContain(res.status());
    const original = await rawLogin(request, user.email, PASSWORD);
    expect(original.status()).toBe(200);
  });

  test('confirmação diferente da nova senha é recusada', async ({ request }) => {
    const user = await createLoggedUser(request);

    const res = await changePassword(request, user.token, PASSWORD, NOVA_SENHA, 'outra-coisa');

    expect([400, 401]).toContain(res.status());
    const original = await rawLogin(request, user.email, PASSWORD);
    expect(original.status()).toBe(200);
  });

  test('não deveria aceitar trocar para a mesma senha', async ({ request }) => {
    test.fail(true, 'Bug conhecido (exploracao.md, #4): a API aceita a mesma senha');
    const user = await createLoggedUser(request);

    const res = await changePassword(request, user.token, PASSWORD, PASSWORD);

    expect(res.ok()).toBe(false);
  });

  test('o token não deveria expor o hash da senha', async ({ request }) => {
    test.fail(true, 'Bug conhecido (exploracao.md, #2): o JWT leva o hash da senha');
    const user = await createLoggedUser(request);

    const payload = JSON.parse(
      Buffer.from(user.token.split('.')[1], 'base64url').toString('utf8'),
    );

    expect(payload.data).not.toHaveProperty('password');
  });

  test('pedido de exclusão de dados é aceito, mas a conta continua ativa [a validar]', async ({ request }) => {
    const user = await createLoggedUser(request);

    // a exclusão confere a resposta da pergunta de segurança, então registramos uma
    const resposta = await request.post('/api/SecurityAnswers/', {
      data: { UserId: user.id, answer: 'teste', SecurityQuestionId: 1 },
    });
    expect(resposta.status()).toBe(201);

    const res = await request.post('/dataerasure', {
      headers: { Cookie: `token=${user.token}` },
      form: { email: user.email, securityAnswer: 'teste' },
    });

    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain('will be processed shortly');

    // comportamento atual: o mesmo usuário ainda consegue entrar
    const depois = await request.post('/rest/user/login', {
      data: { email: user.email, password: PASSWORD },
    });
    expect(depois.status()).toBe(200);
  });
});