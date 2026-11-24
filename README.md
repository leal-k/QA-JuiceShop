# QA Juice Shop

[![CI](https://github.com/leal-k/QA-JuiceShop/actions/workflows/ci.yml/badge.svg)](https://github.com/leal-k/QA-JuiceShop/actions/workflows/ci.yml)

Suíte de testes automatizados, de API e de interface, para o [OWASP Juice Shop](https://owasp-juice.shop), uma loja online feita de propósito para ser testada (e atacada). Montei este projeto para treinar QA de ponta a ponta: explorar a aplicação à mão, descobrir as regras e os bugs, e transformar isso em testes que rodam sozinhos a cada push.

## O que tem aqui

- **Exploração manual** dos fluxos principais, com as chamadas de API que vi no DevTools: [`docs/exploracao.md`](docs/exploracao.md)
- **25 testes de API** com Playwright (cadastro, login, carrinho, carteira e conta). 7 deles são falhas esperadas, de bugs que encontrei e deixei documentados
- **Testes de interface (E2E)** com Playwright e Page Objects: cadastro e login pela tela, exclusão de dados e o checkout completo, com os três tipos de frete
- **CI no GitHub Actions** que sobe o Juice Shop, roda tudo e publica o relatório
- **Relatos de bug** que dá para reproduzir passo a passo: [`docs/bugs/`](docs/bugs)

## Por que o Juice Shop

Ele roda local em Docker, com a versão fixada (v20.0.0), então o ambiente é reproduzível: sobe igual no meu computador e no CI. Também tem de tudo um pouco: regras de negócio com limites, uma API própria e bugs e falhas propositais para achar.

## Como rodar

Precisa de Docker e Node (o CI usa o Node 22).

```bash
docker compose up -d                  # sobe o Juice Shop em http://localhost:3000
npm ci                                # instala as dependências
npx playwright test --project=api     # testes de API
```

Testes de interface:

```bash
npx playwright install chromium
npx playwright test --project=e2e
```

No Fedora, onde o Playwright não tem suporte oficial, eu rodo os testes de interface na imagem Docker oficial dele: `bash scripts/e2e-docker.sh`.

Para ver o relatório depois de rodar: `npx playwright show-report`. O endereço da aplicação vem da variável `BASE_URL` (o padrão é `http://localhost:3000`).

## Como os testes foram pensados

- **Cada teste cria o próprio usuário**, com e-mail único. Assim os testes não dependem uns dos outros, rodam em paralelo e em qualquer ordem.
- **API primeiro, interface só para os fluxos críticos.** Teste de API é mais rápido e mais estável. Nos testes de interface, o que não é o foco (usuário, item no carrinho, cartão, endereço) é preparado pela API, e o teste cuida só do que importa.
- **Page Objects** guardam os seletores e as ações de cada tela. Os seletores usam o papel e o nome acessível dos elementos (`getByRole`), que quebram menos. Onde o nome acessível é diferente do texto que aparece na tela, deixei um comentário no código.
- **Testes de fronteira** nas regras com limite (por exemplo, 5 passa e 6 falha no carrinho; 10 e 1000 passam no saldo, 9 e 1001 não).
- **Bugs conhecidos viram testes marcados com `test.fail`.** O teste afirma o comportamento correto e aparece como falha esperada, então a suíte fica verde e o bug fica documentado. Quando ele for corrigido, o teste passa e avisa que dá para tirar a marca.
- **Comportamento ainda a validar** (sem ter certeza se é erro) vira um teste que registra o que acontece hoje, com `[a validar]` no nome.

## Bugs que encontrei

Como o Juice Shop é vulnerável de propósito, parte do que encontrei são falhas planejadas do próprio projeto. O foco aqui é o próprio processo de explorar, reproduzir, documentar e automatizar. A gravidade é a minha  própria avaliação. A lista completa, com os de menor impacto, está no [`docs/exploracao.md`](docs/exploracao.md).

| Relato | Resumo | Gravidade |
|---|---|---|
| [BUG-13](docs/bugs/bug-13-saldo-sem-validacao-na-api.md) | A API de saldo aceita valores fora de 10 a 1000 (9, 1001 e -10 passam); a regra só existe no formulário | Alta |
| [BUG-02](docs/bugs/bug-02-jwt-expoe-hash-da-senha.md) | O token do login leva dentro dele o hash da senha, que é um MD5 sem sal | Alta |
| [BUG-04](docs/bugs/bug-04-troca-de-senha-aceita-a-mesma-senha.md) | A troca de senha aceita a mesma senha de antes | Média |
| [BUG-01](docs/bugs/bug-01-exclusao-de-dados-nao-apaga-a-conta.md) | O pedido de exclusão de dados diz que será processado em breve, mas a conta continua funcionando e a tela não dá prazo | Média |
| [BUG-03](docs/bugs/bug-03-troca-de-senha-por-get-com-senha-na-url.md) | A troca de senha é um GET com as senhas escritas na URL | Alta |
| [BUG-14](docs/bugs/bug-14-json-mal-formado-expoe-stack-trace.md) | JSON mal formado devolve 500 com a stack trace e os caminhos internos do servidor | Média |

## Estrutura do projeto

```
├── api/                 # testes de API e seus auxiliares (helpers/)
├── e2e/
│   ├── pages/           # Page Objects (uma classe por tela)
│   ├── helpers/         # auxiliares de interface (sessão)
│   └── tests/           # testes de interface
├── docs/
│   ├── exploracao.md    # exploração manual, regras e lista de bugs
│   └── bugs/            # relatos de bug
├── scripts/             # atalhos (E2E na imagem Docker)
├── docker-compose.yml   # Juice Shop com a versão fixada
└── .github/workflows/   # CI
```

## O que ficou de fora

- A **carteira cripto**, que exige uma extensão de navegador (MetaMask) e não dá para automatizar de forma simples
- A **configuração de 2FA**, que exigiria gerar o código TOTP dentro dos testes

## O que vem a seguir

- Testes de carga com k6, com limites de aceitação
- Etiquetas `@smoke` e `@regression`, para rodar só o essencial a cada push e a suíte completa à noite
- Mais relatos de bug

## Aviso

O Juice Shop é vulnerável de propósito. O `docker-compose.yml` abre a porta só no `127.0.0.1`, e a aplicação deve ser usada só localmente, nunca exposta na internet.