# BUG-13: a API de saldo aceita valores fora de 10 a 1000

- **Gravidade:** Alta
- **Onde:** carteira digital (adicionar saldo), `PUT /rest/wallet/balance`
- **Ambiente:** OWASP Juice Shop v20.0.0, rodando em Docker em `http://localhost:3000`
- **Encontrado em:** 21/11/2026, primeiro na exploração manual e depois confirmado com teste automatizado

## Resumo

Na tela da carteira digital, o formulário de adicionar saldo só deixa colocar entre 10 e 1000 moedas. Não aceita valor negativo, nem abaixo de 10, nem acima de 1000. Só que essa regra existe apenas no formulário: quando chamei a API direto, ela aceitou valores fora desse limite e **aplicou o valor no saldo**, inclusive um valor negativo, que deixou a carteira com saldo negativo.

## Como reproduzir

Os comandos guardam o token e o id do cartão em variáveis do terminal, então dá para colar o bloco inteiro de uma vez, trocando só o e-mail e a senha de um usuário já cadastrado. O `python3` aparece só para tirar os campos do JSON.

```bash
EMAIL='user@example.com'
SENHA='your-password'

# 1. Login: guarda o token
TOKEN=$(curl -s -X POST 'http://localhost:3000/rest/user/login' \
  -H 'Content-Type: application/json' \
  --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["authentication"]["token"])')

# 2. Cadastra um cartão: guarda o id
CARTAO=$(curl -s -X POST 'http://localhost:3000/api/Cards/' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  --data-raw '{"fullName":"QA Teste","cardNum":4111111111111111,"expMonth":12,"expYear":2090}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')

# 3. Saldo antes
curl -s 'http://localhost:3000/rest/wallet/balance' -H "Authorization: Bearer $TOKEN"; echo

# 4. Adiciona um saldo fora do limite (aqui, -10)
curl -s -o /dev/null -w 'status: %{http_code}\n' -X PUT 'http://localhost:3000/rest/wallet/balance' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  --data-raw "{\"balance\":-10,\"paymentId\":$CARTAO}"

# 5. Saldo depois
curl -s 'http://localhost:3000/rest/wallet/balance' -H "Authorization: Bearer $TOKEN"; echo
```

O saldo depois deve ser o saldo de antes menos 10. Para testar os outros valores, troque o `-10` no passo 4 por `9` ou `1001`.

## Resultado esperado

A API recusar o valor com um erro 4xx (o mais natural seria 400) e o saldo continuar como estava. Pela tela, a regra é aceitar só de 10 a 1000.

## Resultado obtido

A API respondeu **200** nos três valores que testei, e o saldo mudou de verdade. Cada teste usou um usuário novo, com saldo inicial 0:

| Valor enviado | Status | Saldo depois |
|---|---|---|
| 9 | 200 | 9 |
| 1001 | 200 | 1001 |
| -10 | 200 | -10 |

## Por que isso importa

Quem chama a API direto, sem passar pela tela, passa por cima do limite. Dá para colocar mais do que o máximo permitido (1001 já passou) e dá para **mexer no saldo para baixo** (o -10 deixou a carteira negativa). Num sistema real, com dinheiro de verdade, isso permitiria criar saldo sem controle e corromper o valor da carteira de outros fluxos que dependem dele.

## Causa provável

A validação de 10 a 1000 está só no formulário do front. A API não confere o valor que recebe.

## Sugestão de correção

Validar no servidor: rejeitar `balance` abaixo de 10, acima de 1000 ou negativo, com status 400 e uma mensagem clara. A validação do formulário pode continuar, mas só como conveniência para o usuário, nunca como a única barreira.

## Evidência no repositório

Os testes `recusa adicionar 9 de saldo`, `recusa adicionar 1001 de saldo` e `recusa adicionar -10 de saldo`, em `api/wallet.spec.ts`, afirmam o comportamento correto. Eles estão marcados com `test.fail`, então aparecem como falha esperada enquanto o bug existir. Quando for corrigido, os três passam, e aí é só tirar a marca.
