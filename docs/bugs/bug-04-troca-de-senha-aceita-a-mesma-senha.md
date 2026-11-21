# BUG-04: a troca de senha aceita a mesma senha de antes

- **Gravidade:** Média
- **Onde:** troca de senha (Privacy & Security, Change Password), `GET /rest/user/change-password`
- **Ambiente:** OWASP Juice Shop v20.0.0, rodando em Docker em `http://localhost:3000`
- **Encontrado em:** 20/11/2026, na exploração manual, e depois confirmado com teste automatizado

## Resumo

Na tela de troca de senha, consegui "trocar" a senha para a mesma que já era a atual, e a aplicação aceitou normalmente. Pela API acontece a mesma coisa: ela não compara a senha nova com a atual.

## Como reproduzir

**Pela tela:** entrar com um usuário, abrir o menu da conta, ir em Privacy & Security, depois Change Password, e colocar a mesma senha no campo da senha atual e no da nova senha (e na confirmação).

**Pela API:**

```bash
# Troque pelos dados de um usuário já cadastrado (sem os sinais < >)
EMAIL='usuario@exemplo.com'
SENHA='sua-senha'

# 1. Login: guarda o token
TOKEN=$(curl -s -X POST 'http://localhost:3000/rest/user/login' \
  -H 'Content-Type: application/json' \
  --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["authentication"]["token"])')

# 2. Troca a senha pela mesma senha
curl -s -G 'http://localhost:3000/rest/user/change-password' \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "current=$SENHA" \
  --data-urlencode "new=$SENHA" \
  --data-urlencode "repeat=$SENHA" \
  -o /dev/null -w 'status: %{http_code}\n'
```

## Resultado esperado

A aplicação recusar a troca, com um erro 4xx (o mais natural seria 400) e uma mensagem dizendo que a senha nova precisa ser diferente da atual.

## Resultado obtido

A troca foi aceita e a API respondeu com sucesso (status 2xx). Na prática nada mudou: a senha continua sendo a mesma.

## Por que isso importa

Muita gente troca a senha porque suspeita que ela vazou ou porque a política da empresa manda renovar de tempos em tempos. Se a aplicação deixa "trocar" pela mesma senha, a pessoa fica com a impressão de que a conta foi renovada, mas continua exposta exatamente como antes. O impacto é menor que o dos outros bugs, porque depende de a política da aplicação exigir uma senha diferente.

O mesmo endpoint tem outro problema, que é mandar as senhas na própria URL (item #3 do `exploracao.md`).

## Causa provável

O servidor não compara a senha nova com a atual antes de aceitar a troca.

## Sugestão de correção

Comparar a nova senha com a atual no servidor e recusar com 400 se forem iguais, com uma mensagem clara. Se quiser ir além, também recusar as últimas senhas usadas.

## Evidência no repositório

O teste `não deveria aceitar trocar para a mesma senha`, em `api/account.spec.ts`, afirma o comportamento correto. Ele está marcado com `test.fail`, então aparece como falha esperada enquanto o bug existir. Quando for corrigido, o teste passa, e aí é só tirar a marca.
