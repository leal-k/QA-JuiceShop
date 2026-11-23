import { test, expect } from '../fixtures';
import { createUser, PASSWORD } from '../../api/helpers/auth';
import { LoginPage } from '../pages/LoginPage';
import { AccountMenu } from '../pages/AccountMenu';
import { DataErasurePage } from '../pages/DataErasurePage';

// BUG-01 (docs/bugs/bug-01-...): comportamento atual, ainda a validar com o produto.
// Não tem test.fail porque não afirmamos que é um erro: o teste registra o que acontece hoje.
test('pedir a exclusão de dados mostra a confirmação, mas a conta continua ativa [a validar]', async ({
  page,
  request,
}) => {
  const { id, email } = await createUser(request);
  // a página de exclusão precisa de uma resposta de segurança cadastrada
  const resposta = await request.post('/api/SecurityAnswers/', {
    data: { UserId: id, answer: 'teste', SecurityQuestionId: 1 },
  });
  expect(resposta.status()).toBe(201);

  const login = new LoginPage(page);
  const menu = new AccountMenu(page);
  const exclusao = new DataErasurePage(page);

  // 1) entra pela tela
  await login.open();
  await login.login(email, PASSWORD);
  await expect(page).not.toHaveURL(/#\/login/);

  // 2) pede a exclusão pelo menu da conta
  await menu.goToDataErasure();
  await exclusao.expectOpen();
  await exclusao.requestErasure(email, 'teste');

  // 3) a tela diz que o pedido será processado em breve
  await expect(exclusao.confirmationMessage()).toBeVisible();

  // 4) volta para a loja e tenta entrar de novo com o mesmo usuário
  await exclusao.goToHomePage();
  await login.open();
  await login.login(email, PASSWORD);

  // comportamento atual: o login funciona, a conta continua ativa
  await expect(page).not.toHaveURL(/#\/login/);
});