import { test } from '../fixtures';
import { createLoggedUser } from '../../api/helpers/auth';
import { addItem } from '../../api/helpers/basket';

test('mapa das telas (temporário)', async ({ page, request, context, baseURL }) => {
  const user = await createLoggedUser(request);
  await addItem(request, user, 1, 1); // para o carrinho não ficar vazio

  const mostrar = async (rota: string, titulo: string) => {
    await page.goto(rota);
    await page.waitForLoadState('networkidle');
    console.log(`\n===== ${titulo} (${rota}) =====`);
    console.log(await page.locator('body').ariaSnapshot());
  };

  // 1) telas sem login
  await mostrar('/#/login', 'Login');
  await mostrar('/#/register', 'Cadastro');

  // 2) entra pela API e injeta a sessão no navegador
  await context.addCookies([{ name: 'token', value: user.token, url: baseURL! }]);
  await page.addInitScript(
    ([token, bid]) => {
      localStorage.setItem('token', token);
      sessionStorage.setItem('bid', bid);
    },
    [user.token, String(user.basketId)],
  );

  // 3) telas com login
  await mostrar('/#/search?q=apple', 'Busca');
  await mostrar('/#/basket', 'Carrinho');
  await mostrar('/dataerasure', 'Exclusão de dados');
});