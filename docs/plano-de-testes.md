# Plano de testes

Aqui explico o que eu testo no Juice Shop, por quê, em que ordem de importância, e o que deixei de fora. A ideia é que qualquer pessoa que abra o projeto entenda as escolhas que fiz, e não só veja os testes.

## Objetivo

Verificar, de forma automatizada e repetível, os fluxos que mais importam para quem usa a loja (entrar na conta, mexer no carrinho, pagar e cuidar dos próprios dados), e deixar registrado, com passo a passo, o que está errado.

## Escopo

**Dentro:**

- Cadastro e login
- Carrinho (adicionar itens, limite de unidades por produto, cupom)
- Carteira digital (saldo)
- Conta do usuário (troca de senha, token de login, pedido de exclusão de dados)
- Checkout completo (endereço, entrega, pagamento e pedido)
- Tratamento de erros da API (status e mensagens)

**Fora, e por quê:**

- **Carteira cripto:** exige uma extensão de navegador (MetaMask), que não dá para automatizar de forma simples.
- **2FA:** os testes teriam que gerar o código TOTP, o que fica para uma etapa avançada.
- **Recycle, busca, avaliações e upload de foto de perfil:** explorei à mão e anotei o que vi no `docs/exploracao.md`, mas não automatizei. Ficaram abaixo no meu ranking de risco.
- **Validação dos formulários de endereço e cartão, e acessibilidade:** só exploração manual por enquanto.
- **Outros navegadores e celular:** só uso o Chromium.
- **Os desafios de ataque do próprio Juice Shop:** o foco aqui é qualidade (processo de teste), não exploração de vulnerabilidades.

## Abordagem

Trabalho em camadas, da mais barata para a mais cara:

1. **Exploração manual primeiro.** Antes de automatizar, passei pela aplicação como usuário, olhando a aba Network do DevTools. É dali que saem as regras, os limites e as chamadas de API que os testes usam. Está tudo em `docs/exploracao.md`.
2. **Testes de API.** São a base: rápidos, estáveis e baratos de manter. Cobrem as regras de negócio e os limites.
3. **Testes de interface (E2E), só para os fluxos críticos.** São mais lentos e oscilam mais, então uso poucos: cadastro e login, exclusão de dados e o checkout inteiro. Tudo que não é o foco do teste (criar usuário, pôr item no carrinho, cadastrar cartão e endereço) é preparado pela API.
4. **Testes de carga (planejado).** Com k6, com limites de aceitação.

Nas regras com limite uso **testes de fronteira**: o valor no limite e o primeiro fora dele (5 e 6 unidades no carrinho; 10 e 1000 no saldo, 9 e 1001 fora).

## Ambiente e dados de teste

- Juice Shop **v20.0.0** em Docker, com a versão fixada, então o ambiente é igual no meu computador e no CI. A porta abre só no `127.0.0.1`.
- Cada teste **cria o próprio usuário**, com e-mail único. Os testes não dependem uns dos outros e rodam em paralelo e em qualquer ordem.
- Como o Juice Shop guarda os dados em memória, reiniciar o container volta tudo ao estado inicial.
- O endereço da aplicação vem da variável `BASE_URL` (o padrão é `http://localhost:3000`).
- Node 22 no CI, e o navegador dos testes de interface é o Chromium.

## Riscos e prioridades

Ordenei pelo estrago que o problema faria numa loja de verdade. A prioridade é a minha avaliação.

| Risco | Por que importa | Prioridade | Onde está coberto |
|---|---|---|---|
| Erros com dinheiro (saldo, carteira, checkout) | Erro de valor vira prejuízo | Alta | `api/wallet.spec.ts`, E2E do checkout, BUG-13 |
| Autenticação e senha (login, troca de senha, token) | É a porta de entrada da conta | Alta | `api/auth.spec.ts`, `api/account.spec.ts`, BUG-02, BUG-03, BUG-04 |
| Privacidade e dados pessoais (exclusão, dados no token) | Confiança e obrigação legal | Alta | `api/account.spec.ts`, E2E da exclusão de dados, BUG-01, BUG-02 |
| Carrinho e regras de quantidade | Afeta diretamente a venda | Média | `api/basket.spec.ts` |
| Tratamento de erros (status e mensagens) | Segurança e monitoramento | Média | `api/errors.spec.ts`, BUG-14 |
| Validação de formulários na tela (endereço, cartão) | Experiência de uso | Baixa a média | só exploração manual |
| Acessibilidade | Inclusão de quem usa leitor de tela | Baixa neste projeto | só exploração manual |

Os riscos altos têm cobertura de API **e** de tela. Os baixos ficaram só na exploração manual, de propósito.

## O que cobre cada área

| Área | Testes | Arquivo |
|---|---|---|
| Cadastro e login | 3 de API, 2 de tela | `api/auth.spec.ts`, `e2e/tests/auth.spec.ts` |
| Carrinho | 7 de API | `api/basket.spec.ts` |
| Carteira | 7 de API | `api/wallet.spec.ts` |
| Conta (senha, token, exclusão de dados) | 7 de API | `api/account.spec.ts` |
| Tratamento de erros | 1 de API | `api/errors.spec.ts` |
| Checkout | 4 de tela | `e2e/tests/checkout.spec.ts` |
| Exclusão de dados | 1 de tela | `e2e/tests/data-erasure.spec.ts` |
| Página inicial (teste de fumaça) | 1 de tela | `e2e/tests/home.spec.ts` |

No total são 33 testes: 25 de API e 8 de tela.

## Como trato os bugs

- **Bug confirmado:** vira um teste que afirma o comportamento **correto** e leva `test.fail`. A suíte fica verde e o bug fica documentado. Quando corrigirem, o teste passa e avisa que dá para tirar a marca. Hoje são 7 testes assim.
- **Comportamento que não sei se é erro:** vira um teste que registra o que acontece hoje, com `[a validar]` no nome e sem `test.fail`.
- **Todo bug confirmado tem um relato** em `docs/bugs/`, com passo a passo, resultado esperado, resultado obtido, impacto e sugestão de correção. Os de menor impacto ficam só na tabela do `docs/exploracao.md`.
- A gravidade é sempre a minha avaliação, e vem junto da explicação do porquê.

## Critérios para considerar pronto

- A suíte inteira passa no CI, com as falhas esperadas todas marcadas.
- Cada bug confirmado tem relato e teste.
- Nenhum teste depende de outro nem de um usuário fixo.
- Teste de interface que oscila (passa só na segunda tentativa) é investigado, não ignorado. No CI os testes de tela têm uma repetição, e o relatório mostra quando isso acontece.

## Limitações

- O Juice Shop é vulnerável de propósito, então parte do que achei é falha planejada do próprio projeto. O valor do trabalho está no processo, não em ter "descoberto" as falhas.
- Só testo no Chromium, e só contra a versão fixada. Uma versão nova do Juice Shop pode mudar comportamentos e quebrar testes.
- A cobertura de formulários e de acessibilidade é só manual.

## Próximos passos

- Testes de carga com k6
- Etiquetas `@smoke` e `@regression`, para rodar só o essencial a cada push e a suíte completa à noite
- Automatizar as validações dos formulários de endereço e cartão
