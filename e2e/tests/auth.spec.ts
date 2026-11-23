import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { createUser, PASSWORD } from '../../api/helpers/auth';

test('cadastro pela tela leva ao login e o novo usuário consegue entrar', async ({ page }) => {
  const email = `qa-${randomUUID()}@example.com`;
  const register = new RegisterPage(page);
  const login = new LoginPage(page);

  await register.open();
  await register.register(email, PASSWORD, 'teste');
  await expect(page).toHaveURL(/#\/login/);

  await login.login(email, PASSWORD);
  await expect(page).not.toHaveURL(/#\/login/);
});

test('login com senha errada mostra o erro', async ({ page, request }) => {
  const { email } = await createUser(request); // usuário criado pela API, que é mais rápido
  const login = new LoginPage(page);

  await login.open();
  await login.login(email, 'senha-errada');

  await expect(page.getByText('Invalid email or password.')).toBeVisible();
});