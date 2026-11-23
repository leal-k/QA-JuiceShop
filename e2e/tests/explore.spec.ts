import { test } from '../fixtures';
import { createLoggedUser } from '../../api/helpers/auth';
import { addItem } from '../../api/helpers/basket';

test('mapa das telas logado (temporário)', async ({ page, request, context, baseURL }) => {
  const user = await createLoggedUser(request);
  await addItem(request, user, 1, 1);
  await request.post('/api/SecurityAnswers/', {
    data: { UserId: user.id, answer: 'teste', SecurityQuestionId: 1 },
  });

  // a sessão tem que ser registrada ANTES do primeiro goto
  await context.addCookies([{ name: 'token', value: user.token, url: baseURL! }]);
  await context.addInitScript(
    ([token, bid]) => {
      localStorage.setItem('token', token);
      sessionStorage.setItem('bid', bid);
    },
    [user.token, String(user.basketId)],
  );

  const mostrar = async (titulo: string) => {
    await page.waitForTimeout(1500);
    console.log(`\n===== ${titulo} =====`);
    console.log(await page.locator('body').ariaSnapshot());
  };

  await page.goto('/#/search');
  await mostrar('Loja logado');

  await page.getByRole('button', { name: 'Show/hide account menu' }).click();
  await mostrar('Menu da conta aberto');
  await page.keyboard.press('Escape');

  await page.goto('/#/basket');
  await mostrar('Carrinho com 1 item');

  await page.goto('/#/privacy-security/data-erasure');
  await mostrar('Privacidade: exclusão de dados');

  await page.goto('/dataerasure');
  await mostrar('Formulário /dataerasure');
});