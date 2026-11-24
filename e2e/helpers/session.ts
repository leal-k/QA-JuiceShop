import { BrowserContext } from '@playwright/test';
import { LoggedUser } from '../../api/helpers/auth';

// Deixa o navegador logado sem passar pela tela de login.
// Precisa rodar ANTES do primeiro goto: o script de inicialização só vale
// para páginas carregadas depois dele.
export async function iniciarSessao(context: BrowserContext, baseURL: string, user: LoggedUser) {
  await context.addCookies([{ name: 'token', value: user.token, url: baseURL }]);
  await context.addInitScript(
    ([token, bid]) => {
      localStorage.setItem('token', token);
      sessionStorage.setItem('bid', bid);
    },
    [user.token, String(user.basketId)],
  );
}