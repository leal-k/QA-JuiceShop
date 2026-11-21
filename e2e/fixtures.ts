import { test as base } from '@playwright/test';

// Os cookies que o próprio site grava quando você fecha o banner de boas-vindas
// e o aviso de cookies (vistos nos seus cURLs). Assim os testes não precisam
// clicar nesses dois diálogos toda vez.
export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    await context.addCookies([
      { name: 'welcomebanner_status', value: 'dismiss', url: baseURL! },
      { name: 'cookieconsent_status', value: 'dismiss', url: baseURL! },
      { name: 'language', value: 'en', url: baseURL! },
    ]);
    await use(context);
  },
});

export { expect } from '@playwright/test';