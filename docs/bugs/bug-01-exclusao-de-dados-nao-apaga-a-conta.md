# BUG-01: o pedido de exclusão de dados não tem efeito visível: a conta continua ativa e a tela não dá prazo

- **Gravidade:** Média
- **Onde:** Privacy & Security, Request Data Erasure
- **Ambiente:** OWASP Juice Shop v20.0.0, rodando em Docker em `http://localhost:3000`
- **Encontrado em:** 20/11/2026, na exploração manual, e reproduzido em 21/11/2026 com o texto exato da mensagem

## Resumo

Pedi a exclusão dos meus dados pela tela de privacidade. A tela cita o Art. 17 do GDPR e diz que permite pedir a exclusão completa da conta e de todos os dados associados. Depois que confirmo, aparece a mensagem "Your erasure request will be processed shortly" (o pedido será processado em breve) e eu sou levado para a página inicial, já deslogado. Só que, logo em seguida, consigo fazer login de novo normalmente, com o mesmo e-mail e a mesma senha, sem nenhum aviso de que existe um pedido de exclusão em andamento.

Não dá para afirmar que isso é um erro, porque a mensagem fala em processar depois. O que eu consigo afirmar é que a tela não diz **quando**, não manda nenhuma confirmação e a conta continua funcionando como se nada tivesse sido pedido.

## Como reproduzir

1. Cadastrar um usuário novo e fazer login.
2. Abrir o menu Account (no topo da tela), ir em Privacy & Security e depois em Request Data Erasure.
3. A tela mostra o título "Data Erasure Request (Art. 17 GDPR)", um texto dizendo que, de acordo com a GDPR, é permitido pedir a exclusão completa da conta e dos dados associados, e um subtítulo "Request Data Erasure" acima do formulário. Esse subtítulo é só um título, não é um botão.
4. O formulário tem dois campos: "Confirm Email Address" e "Answer" (a resposta da pergunta de segurança). No campo do e-mail, o e-mail do usuário aparece em cinza claro, como placeholder (texto de dica); no campo da resposta, aparece do mesmo jeito a pergunta de segurança ("Your eldest siblings middle name?", no meu caso). Em nenhum dos dois o valor vem preenchido, então é preciso digitar. Preencher os dois e clicar no botão **Delete User Data**.
5. Aparece a mensagem "Sorry to see you leave! Your erasure request will be processed shortly." e um botão para ir à página inicial.
6. Clicar no botão: vou para a página principal da loja, deslogado.
7. Fazer login de novo com o mesmo e-mail e a mesma senha: o login funciona.

**Pela API:** a exclusão é um formulário comum, enviado para `/dataerasure`, e a autenticação vai pelo cookie `token`. O bloco abaixo faz o login, pede a exclusão e tenta logar de novo. O usuário precisa ter uma resposta de segurança cadastrada, o que já acontece quando o cadastro é feito pela tela.

```bash
# Troque pelos dados de um usuário já cadastrado (sem os sinais < >)
EMAIL='usuario@exemplo.com'
SENHA='sua-senha'
RESPOSTA='resposta-da-pergunta-de-seguranca'

# 1. Login: guarda o token
TOKEN=$(curl -s -X POST 'http://localhost:3000/rest/user/login' \
  -H 'Content-Type: application/json' \
  --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["authentication"]["token"])')

# 2. Pede a exclusão dos dados
curl -s -o /dev/null -w 'exclusão: %{http_code}\n' -X POST 'http://localhost:3000/dataerasure' \
  -H "Cookie: token=$TOKEN" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "securityAnswer=$RESPOSTA"

# 3. Tenta logar de novo com o mesmo usuário e a mesma senha
curl -s -o /dev/null -w 'login depois: %{http_code}\n' -X POST 'http://localhost:3000/rest/user/login' \
  -H 'Content-Type: application/json' \
  --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}"
```

Uma diferença em relação às outras chamadas do projeto: aqui não é uma API em JSON. O caminho fica fora de `/api` e `/rest`, o corpo vai como formulário (`email` e `securityAnswer`) e a resposta é uma página HTML, com status **200**. A tela de exclusão também fica nesse endereço (o cabeçalho `Referer` da requisição aponta para `/dataerasure`), e não em um `#/...` como as outras telas.

## Resultado esperado

Uma destas duas coisas:

- A conta ser removida ou desativada, e o login com ela deixar de funcionar.
- Se o pedido é processado depois, a tela dizer **quando** (um prazo), avisar de algum jeito que o pedido foi registrado (e-mail ou número de protocolo) e, se eu tentar entrar de novo, a aplicação mostrar que há uma exclusão pendente (e, de preferência, permitir cancelar).

## Resultado obtido

Depois de confirmar, a tela mostrou "Sorry to see you leave! Your erasure request will be processed shortly." e me deslogou. O login logo depois funcionou normalmente, sem prazo, sem protocolo e sem nenhum aviso de exclusão pendente. Ainda não testei por quanto tempo a conta fica ativa nem se em algum momento ela é removida.

Outro detalhe: o botão que confirma o pedido se chama "Delete User Data", que passa a ideia de exclusão imediata, mas a mensagem que aparece depois fala só em um pedido a ser processado.

## Por que isso importa

A tela se apresenta como um pedido de exclusão completa, citando o Art. 17 do GDPR, mas quem usa não tem como saber se alguma coisa vai de fato acontecer: não tem prazo, não tem confirmação e a conta segue funcionando como antes. O GDPR (Art. 17, o mesmo que a tela cita) prevê o direito de pedir a eliminação dos dados e que ela seja feita sem demora injustificada, com algumas exceções, e a LGPD também prevê o direito de eliminação. Como eu não sei o que acontece depois da mensagem, classifico como gravidade Média e como algo a validar com quem definiu o produto, e não como falha confirmada.

## Causa provável

Minha hipótese é que a tela só registra o pedido de exclusão e não remove nem desativa a conta. Ainda não confirmei isso.

## Sugestão de correção

Se a exclusão pode ser imediata, remover ou desativar a conta e bloquear o login. Se é um pedido processado depois, a tela deve dizer o prazo, mandar uma confirmação e marcar a conta como "exclusão pendente", mostrando esse aviso quando a pessoa tentar entrar, com a opção de cancelar o pedido.

## Evidência no repositório

O teste `pedido de exclusão de dados é aceito, mas a conta continua ativa [a validar]`, em `api/account.spec.ts`, documenta o comportamento atual. Diferente dos testes dos outros bugs, ele **não** está marcado com `test.fail`, porque ainda não afirmo que isso é um erro: ele registra o que acontece hoje. Se um dia a conta passar a ser removida ou bloqueada depois do pedido, o teste falha, e aí a gente revisa.

## A completar

- Esperar alguns minutos e tentar o login de novo, para ver se a conta continua ativa.
