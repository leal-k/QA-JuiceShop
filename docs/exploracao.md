# Exploração manual do Juice Shop

Antes de automatizar qualquer coisa, passei pela aplicação como um usuário comum e fui anotando o que acontecia na tela e o que aparecia na aba Network do DevTools. Este documento junta tudo: os fluxos que percorri, as chamadas de API que vi, as regras que consegui descobrir e o que me pareceu bug.

## Ambiente

- OWASP Juice Shop **v20.0.0** (tag oficial), rodando em Docker Compose em `http://localhost:3000`
- Navegador: Firefox, no Linux
- Exploração feita em 19 e 20 de novembro de 2026
- Nos exemplos de requisição, o que está entre `< >` é variável, não valor real

## Resumo rápido

Passei por busca, cadastro, login, perfil, carrinho, cupom, checkout, recycle, endereços, cartões e carteira. O que mais me chamou atenção:

- A **exclusão de dados** diz que apagou, mas consigo logar de novo com o mesmo usuário
- O **token JWT carrega o hash da senha** dentro dele
- A **troca de senha** é um GET com as senhas na URL, e ainda aceita trocar para a mesma senha
- O recycle aceita **data de coleta no passado**
- Faltam validações em alguns formulários (cidade, estado e nome do cartão aceitam número) e tem um texto quebrado (`{{range}}`)

---

## Fluxos que percorri

### Busca de produtos

Pesquisei "a" na barra de busca. O primeiro resultado na aba Network foi o `no-results.png`, com 200, mesmo a busca tendo encontrado vários produtos. Logo depois vieram as imagens dos produtos em si, com 304. Pelo que entendi, o `no-results.png` é uma imagem que a própria tela já carrega por garantia, então não é bug, e o 304 é o navegador reaproveitando imagens que já estavam em cache.

Também vi algumas chamadas GET para `whoami?fields=email` logo depois que eu clicava num produto. O type é json e na coluna transferred aparece como cached.

### Cadastro e login

Quando registrei um usuário, vi as chamadas de API de security question (GET), users (POST) e security answers (POST). Os dois POSTs voltaram **201**.

Quando loguei com esse usuário, vi de novo a chamada `whoami?fields=email`, junto com uma chamada só `whoami`, o login (POST, **200**) e uma chamada com nome `6`, que é o carrinho (`/rest/basket/6`). Esse 6 é o id do carrinho, que o próprio login devolve no campo `bid`.

### Perfil e conta

**Upload de imagem.** Quando tentei subir uma imagem no meu perfil, nem cheguei a poder selecionar o arquivo: a tela me joga direto num erro em JSON, `error: file is not passed`. Na aba Network foi um POST com nome `file` e status 400. Ou seja, o upload já falha antes de eu escolher qualquer imagem, então a função fica inutilizável. É bug de verdade.

**Último IP de login.** Tem uma opção de mostrar o last login IP. Entrei e o IP estava como `0.0.0.0`, e é sempre esse, não muda. O próprio cadastro já devolve `lastLoginIp: "0.0.0.0"`. Testei e confirmei: a aplicação pega esse IP do cabeçalho `True-Client-IP`, numa chamada separada do login (`GET /rest/saveLoginIp`), e não do endereço real da conexão. Mandei a chamada com `True-Client-IP: 1.2.3.4` e, na tela do último IP, o valor mudou para `1.2.3.4`. O navegador não manda esse cabeçalho, então o `0.0.0.0` fixo é o comportamento esperado aqui. O ponto de atenção é que o valor vem de um cabeçalho que quem faz a requisição controla, então ele pode ser falsificado.

**2FA.** Não usei a configuração de 2FA, mas ela mostra um QR code com uma URL `otpauth://totp/OWASP%20Juice%20Shop:<email>?secret=<segredo>&issuer=OWASP%20Juice%20Shop`. Também pede a senha atual e o initial token.

**Export de dados.** Quando pedi meus dados em JSON, ele abriu outra janela com os dados.

**Exclusão de dados.** Quando solicitei a exclusão dos meus dados e confirmei, o site disse que tinha apagado, mas consegui fazer login com o mesmo usuário.

**Troca de senha.** Consegui mudar a senha para a mesma senha antiga. Na aba Network dá para ver que a chamada é um GET e que a URL entrega as senhas:

```
/rest/user/change-password?current=<senha atual>&new=<senha nova>&repeat=<senha nova>
```

### Carrinho

Quando adiciono itens no carrinho, as chamadas de API aparecem nessa sequência:

1. `GET /rest/basket/6`, 304
2. `POST /api/BasketItems/`, **200**
3. `GET /api/Products/1?d=<data>`, 304
4. `GET /rest/basket/6`, 200

O site me bloqueia com no máximo **5 unidades de cada produto**: a 6ª falha com **400** no `PUT /api/BasketItems/<id>`.

### Cupom

Quando tentei usar um cupom de desconto que não existe, deu **404** em `PUT /rest/basket/6/coupon/<código>`.

### Checkout

Na hora de fechar o pedido, o delivery speed tem 3 opções, mas só dá para selecionar uma, o que está correto.

No checkout foram chamadas:

- `POST /rest/basket/6/checkout`, 200
- `GET /rest/basket/6`, 200
- `GET /rest/track-order/<código>`, 200
- `GET /rest/admin/application-configuration`, 304
- `GET /api/Addresss/7`, 304

### Pedidos (Ordered products)

Na página Ordered products, o título está cortado na tela e não dá para ler. A chamada de API usou o mesmo código da compra que eu tinha feito antes.

### Recycle

O campo de quantidade está certo: o mínimo é 10 e o máximo é 1000. Tentei -10 e 1001 e nenhum dos dois passa.

A opção de pickup date ("Please pickup at above address instead of sending a recycle box.") só aparece quando a quantidade é maior que 100 (com 101 já aparece), sendo que o mínimo é 10.

Sobre a pickup date: consegui colocar uma data do passado, mas o botão submit não liberava, e mesmo com uma data no futuro também não. Só que depois consegui pedir uma pickup date no passado para um endereço cadastrado. Isso ficou contraditório e preciso reproduzir direito. Minha hipótese é que o botão só libera quando tem um endereço selecionado.

### Endereços

No cadastro de endereços, o mobile number tem um limite de dígitos no campo, mas na tooltip não aparece o limite, aparece só `{{range}}`. O mesmo acontece no zip code. Os campos permitem digitar letras, mas elas não são aceitas. Em cidade e estado, por outro lado, é permitido digitar números.

As chamadas de API parecem corretas: `GET /api/Addresss` (304 e depois 200), `POST /api/Addresss` (**201**).

### Cartões

No cadastro de cartão de crédito, o campo de nome permite digitar números. No campo de número é permitido digitar letras, mas elas não são aceitas. As chamadas de API parecem certas: `GET /api/Cards` (200), `POST /api/Cards/` (**201**) e outro `GET /api/Cards` (200).

### Carteira

No add balance só dá para adicionar entre 10 e 1000 moedas. Não aceita valor negativo, nem abaixo de 10, nem acima de 1000. As chamadas parecem ok: um `PUT` em `balance` com 200.

Na opção "try our crypto wallet" não consegui acessar, porque pede a instalação de uma web3 wallet como a MetaMask. Depois disso, quando clico no menu do meu nome, a tela inteira fica cinza e só aparecem as opções do menu.

---

## Requisições observadas

Já limpas: sem cookies, sem `User-Agent` e sem token real. Tudo em `http://localhost:3000`.

### 1. Cadastro de usuário

**1a. Criar usuário** (status **201**)

```bash
curl -X POST 'http://localhost:3000/api/Users/' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"<email>","password":"<senha>","passwordRepeat":"<senha>","securityQuestion":{"id":1,"question":"Your eldest siblings middle name?","createdAt":"2026-11-20T01:46:22.833Z","updatedAt":"2026-11-20T01:46:22.833Z"},"securityAnswer":"<resposta>"}'
```

```json
{
  "status": "success",
  "data": {
    "username": "",
    "role": "customer",
    "deluxeToken": "",
    "lastLoginIp": "0.0.0.0",
    "profileImage": "/assets/public/images/uploads/default.svg",
    "isActive": true,
    "id": 26,
    "email": "teste2@teste.com",
    "updatedAt": "2026-11-20T03:07:50.683Z",
    "createdAt": "2026-11-20T03:07:50.683Z",
    "deletedAt": null
  }
}
```

- A senha não é devolvida. O usuário novo nasce com `role: customer`.
- `lastLoginIp` já nasce como `0.0.0.0`.
- `data.id` é o `UserId` usado na chamada 1b.

**1b. Registrar a resposta de segurança** (status **201**)

```bash
curl -X POST 'http://localhost:3000/api/SecurityAnswers/' \
  -H 'Content-Type: application/json' \
  --data-raw '{"UserId":<id de 1a>,"answer":"<resposta>","SecurityQuestionId":1}'
```

```json
{
  "status": "success",
  "data": {
    "id": 24,
    "UserId": 26,
    "answer": "<hash de 64 caracteres>",
    "SecurityQuestionId": 1,
    "updatedAt": "2026-11-20T03:07:50.716Z",
    "createdAt": "2026-11-20T03:07:50.716Z"
  }
}
```

- A resposta é guardada e devolvida como hash, não em texto puro.

### 2. Login (status **200**)

```bash
curl -X POST 'http://localhost:3000/rest/user/login' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"<email>","password":"<senha>"}'
```

```json
{
  "authentication": {
    "token": "<JWT>",
    "bid": 6,
    "umail": "teste@teste.com"
  }
}
```

- O formato é diferente das chamadas `/api/...`: não tem `status`/`data`, usa `authentication`.
- O `token` vai no cabeçalho `Authorization: Bearer <token>` das chamadas seguintes (na tela ele também vai no cookie `token`).
- `bid` é o id do carrinho e vem como **número**.

### 3. Adicionar item ao carrinho (status **200**)

```bash
curl -X POST 'http://localhost:3000/api/BasketItems/' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  --data-raw '{"ProductId":1,"BasketId":"<basketId>","quantity":1}'
```

```json
{
  "status": "success",
  "data": {
    "id": 13,
    "ProductId": 1,
    "BasketId": "6",
    "quantity": 1,
    "updatedAt": "2026-11-20T02:58:56.237Z",
    "createdAt": "2026-11-20T02:58:56.237Z"
  }
}
```

- `BasketId` é **string** na requisição e na resposta, enquanto `id` e `ProductId` são números (e o `bid` do login é número).
- `data.id` é o id do item, usado no PUT abaixo.
- `createdAt` e `updatedAt` mudam a cada chamada, então nos testes só dá para verificar o formato.
- Criar usuário e criar resposta de segurança devolvem 201, mas criar item de carrinho devolve 200. Uma inconsistência pequena.

### 4. Outras chamadas do carrinho

**Ver o carrinho**

```bash
curl 'http://localhost:3000/rest/basket/<basketId>' \
  -H 'Authorization: Bearer <token>'
```

**Ver um item** (`GET /api/BasketItems/<id do item>`, mesmo cabeçalho de autorização; não anotei a resposta)

**Alterar a quantidade** (5 passa, 6 volta 400)

```bash
curl -X PUT 'http://localhost:3000/api/BasketItems/<id do item>' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  --data-raw '{"quantity":2}'
```

**Salvar o IP do último login**

```bash
curl 'http://localhost:3000/rest/saveLoginIp' \
  -H 'Authorization: Bearer <token>' \
  -H 'True-Client-IP: 1.2.3.4'
```

- É essa chamada que guarda o IP, e ele sai do cabeçalho `True-Client-IP`. Depois de chamar, a tela do último IP passou a mostrar `1.2.3.4`.

---

## Token JWT decodificado

O token é um JWT, que é assinado mas **não é criptografado**: o miolo é só base64 e dá para ler. Decodifiquei localmente, sem colar em site nenhum:

```bash
TOKEN='<token inteiro>'
payload=$(echo "$TOKEN" | cut -d. -f2 | tr '_-' '/+')
while [ $(( ${#payload} % 4 )) -ne 0 ]; do payload="${payload}="; done
echo "$payload" | base64 -d | python3 -m json.tool
```

O conteúdo (com o valor da senha ocultado):

```json
{
  "status": "success",
  "data": {
    "id": 24,
    "username": "",
    "email": "teste@teste.com",
    "password": "<32 caracteres hexadecimais, parece um hash MD5>",
    "role": "customer",
    "deluxeToken": "",
    "lastLoginIp": "",
    "profileImage": "/assets/public/images/uploads/default.svg",
    "totpSecret": "",
    "isActive": true,
    "createdAt": "2026-11-20 02:05:14.505 +00:00",
    "updatedAt": "2026-11-20 02:50:06.833 +00:00",
    "deletedAt": null
  },
  "iat": 1795143132
}
```

É um problema de privacidade e de segurança: o hash da senha viaja dentro do token em toda requisição. A resposta do cadastro, por outro lado, não devolve a senha, então a diferença entre os dois reforça que isso é um vazamento.

---

## Regras e limites que descobri

| Onde | Regra observada | Como testar |
|---|---|---|
| Recycle, quantidade | Mínimo 10, máximo 1000 | 9, 10, 1000, 1001 e -10 |
| Recycle, pickup date | A opção só aparece com quantidade maior que 100 | 100, 101 e 102 |
| Add balance | Entre 10 e 1000 | 9, 10, 1000, 1001 e valor negativo |
| Carrinho | No máximo 5 unidades de cada produto (o 6º volta 400 no PUT) | 5 passa, 6 falha |
| Cupom | Cupom inexistente devolve 404 | Código inventado |
| Checkout, delivery speed | 3 opções, só uma selecionável | Uma por vez |
| Cadastro | Senha não volta na resposta, `role` nasce como `customer` | Verificar o corpo |

---

## Possíveis bugs

A coluna "Gravidade" é só a minha impressão por enquanto. Nenhum foi reportado ainda: cada um precisa ser reproduzido antes, com os passos exatos.

| # | O que vi | Gravidade | O que falta reproduzir |
|---|---|---|---|
| 1 | Exclusão de dados confirma que apagou, mas o login continua funcionando | Alta | Anotar o texto exato que a tela mostra e tentar logar de novo depois de recarregar |
| 2 | O JWT leva o hash da senha dentro do payload | Alta | Já decodificado, falta conferir com um usuário novo |
| 3 | Troca de senha é um GET com `current`, `new` e `repeat` na URL | Alta | Ver o que acontece se faltar algum parâmetro |
| 4 | Troca de senha aceita a mesma senha de antes | Média | Repetir com um usuário novo |
| 5 | Recycle aceita data de coleta no passado | Média | Resolver a contradição do botão submit (ver pendências) |
| 6 | Tela cinza no menu do meu nome depois de tentar a carteira cripto | Média | Anotar a sequência exata de cliques |
| 7 | Cidade e estado aceitam número; nome do cartão aceita número | Baixa | Anotar o que a API responde quando recebe esses valores |
| 8 | Tooltip mostra `{{range}}` em vez do limite (mobile number e zip code) | Baixa | Print da tela |
| 9 | Título cortado em Ordered products | Baixa | Anotar o tamanho da janela |
| 10 | Upload de imagem do perfil falha antes de eu poder escolher o arquivo e mostra o JSON de erro cru (`file is not passed`, 400) | Média | Anotar o clique exato e ver se acontece sempre (outro usuário, outro navegador) |
| 11 | O último IP vem do cabeçalho `True-Client-IP`, que quem faz a requisição controla, então dá para falsificar (o `0.0.0.0` fixo no navegador é esperado) | Baixa | Já confirmado com `1.2.3.4`; falta só guardar os passos |
| 12 | Criar item no carrinho devolve 200, enquanto as outras criações devolvem 201; `BasketId` é string e `bid` é número | Baixa | Só inconsistência, anotar nos testes |

---

## Esperado ou do ambiente

- `no-results.png` com 200 na busca: imagem que a própria tela carrega por garantia
- 304 nas imagens e em outras chamadas: cache do navegador funcionando
- `whoami` como cached: o navegador reaproveitando a resposta
- Delivery speed com 3 opções e só uma selecionável: comportamento normal
- Campos numéricos que deixam digitar letra mas não aceitam: a validação está funcionando
- Resposta de segurança guardada como hash e senha não devolvida no cadastro: pontos positivos
- `lastLoginIp` em `0.0.0.0` no navegador: a tela não manda o cabeçalho `True-Client-IP` que a aplicação usa para guardar o IP

## Fora de escopo (por enquanto)

- **Carteira cripto**: exige uma extensão web3 (MetaMask), que não dá para automatizar de forma simples
- **2FA**: exigiria gerar o código TOTP nos testes, fica para depois

---


## O que vira teste automatizado

- Cadastro: usuário criado com `role: customer`, sem senha na resposta (201)
- Login válido (200, com token e `bid`) e login com senha errada (esperado recusar, a confirmar qual status)
- Carrinho: adicionar item (200), até 5 unidades passam e a 6ª falha com 400
- Cupom inexistente devolvendo 404
- Add balance e recycle com os limites da tabela acima
- Checkout completo (200)
- Troca de senha para a mesma senha, para documentar o comportamento atual
