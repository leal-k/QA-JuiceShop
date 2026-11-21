# BUG-02: o token JWT do login leva o hash da senha dentro dele

- **Gravidade:** Alta
- **Onde:** login, `POST /rest/user/login` (o token que ele devolve)
- **Ambiente:** OWASP Juice Shop v20.0.0, rodando em Docker em `http://localhost:3000`
- **Encontrado em:** 20/11/2026, na exploração manual, e depois confirmado com teste automatizado

## Resumo

Quando decodifiquei o token que o login devolve, vi que o payload dele carrega o registro do usuário quase inteiro, inclusive um campo `password` com um hash. Comparei esse hash com o MD5 da senha que usei no login e o valor é **exatamente o mesmo**: é um MD5 puro, sem sal. Ou seja, a senha do usuário viaja dentro do token, em toda requisição, só que "embaralhada" de um jeito fraco.

## Como reproduzir

Um JWT é assinado, mas **não é criptografado**: o miolo dele é só base64, qualquer pessoa consegue ler. O bloco abaixo faz o login, decodifica o miolo e calcula o MD5 da senha para comparar.

```bash
# Troque pelos dados de um usuário já cadastrado (sem os sinais < >)
EMAIL='usuario@exemplo.com'
SENHA='sua-senha'

# 1. Login: guarda o token
TOKEN=$(curl -s -X POST 'http://localhost:3000/rest/user/login' \
  -H 'Content-Type: application/json' \
  --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["authentication"]["token"])')

# 2. Decodifica o miolo do token
echo "$TOKEN" | python3 -c '
import sys, base64, json
payload = sys.stdin.read().strip().split(".")[1]
payload += "=" * (-len(payload) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(payload)), indent=2))'

# 3. Calcula o MD5 da senha, para comparar com o campo "password" do passo 2
printf '%s' "$SENHA" | md5sum
```

## Resultado esperado

O token ter só o necessário para identificar quem está logado (por exemplo, `id`, `email` e `role`), sem senha, sem hash e sem nenhum segredo. E, mesmo que o hash fosse guardado no banco, ele ser feito com um algoritmo próprio para senhas e com sal, de forma que não dê para descobrir a senha a partir dele.

## Resultado obtido

O payload do token inclui o campo `password` com 32 caracteres hexadecimais. Conferi com dois usuários meus:

| Senha usada | Campo `password` dentro do token | MD5 da senha |
|---|---|---|
| `teste` | `698dc19d489c4e4db73e28a713eab07b` | `698dc19d489c4e4db73e28a713eab07b` |
| `teste1` | `e959088c6049f1104c84c9bde5560a13` | `e959088c6049f1104c84c9bde5560a13` |

Nos dois casos o hash é igual ao MD5 da senha, sem nada a mais. Também reparei que o payload traz o campo `totpSecret` (vazio no meu usuário). Não testei com o 2FA ligado, mas fica a dúvida se o segredo do 2FA também iria dentro do token nesse caso.

Outra coisa que ajuda a mostrar que é um vazamento: a resposta do cadastro (`POST /api/Users/`) **não** devolve a senha. Então o dado fica exposto só pelo token.

## Por que isso importa

O token fica guardado no navegador e é enviado em toda requisição (no cabeçalho `Authorization` e no cookie). Qualquer coisa que consiga ler esse token, como uma extensão do navegador, um log de proxy ou um script injetado na página, leva junto o hash da senha. E o MD5 sem sal é rápido de calcular e tem tabelas prontas na internet, então senhas comuns voltam em segundos. Como muita gente reaproveita a senha em outros sites, o estrago pode passar da aplicação.

## Causa provável

O servidor monta o token com o registro inteiro do usuário, em vez de escolher só os campos necessários.

## Sugestão de correção

Colocar no token só o essencial (`id`, `email`, `role`), nunca senha, hash ou segredos. E trocar o MD5 por um algoritmo próprio para guardar senhas, como bcrypt, scrypt ou Argon2, com sal.

## Evidência no repositório

O teste `o token não deveria expor o hash da senha`, em `api/account.spec.ts`, afirma o comportamento correto. Ele está marcado com `test.fail`, então aparece como falha esperada enquanto o bug existir. Quando for corrigido, o teste passa, e aí é só tirar a marca.
