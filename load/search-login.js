import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PERFIL = __ENV.PERFIL || 'carga';

// smoke: 1 usuário por 10s, só para ver se o script funciona
// carga: sobe até 10 usuários, mantém 1 minuto e desce
const perfis = {
  smoke: { vus: 1, duration: '10s' },
  carga: {
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '30s', target: 0 },
    ],
  },
};

export const options = {
  ...perfis[PERFIL],
  thresholds: {
    http_req_failed: ['rate<0.01'],                    // menos de 1% de erro
    'http_req_duration{name:busca}': ['p(95)<100'],    // 95% das buscas abaixo de 100 ms
    'http_req_duration{name:login}': ['p(95)<150'],    // 95% dos logins abaixo de 150 ms
    checks: ['rate>0.99'],                             // mais de 99% das verificações OK
  },
};

const SENHA = 'Senha@12345';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const TERMOS = ['apple', 'juice', 'banana', 'smoothie', 'lemon'];

// roda uma vez antes de tudo: cria o usuário que os logins vão usar
export function setup() {
  const email = `k6-${Date.now()}@example.com`;
  const res = http.post(
    `${BASE_URL}/api/Users/`,
    JSON.stringify({
      email,
      password: SENHA,
      passwordRepeat: SENHA,
      securityQuestion: { id: 1, question: 'Your eldest siblings middle name?' },
      securityAnswer: 'teste',
    }),
    { headers: JSON_HEADERS },
  );
  if (res.status !== 201) {
    throw new Error(`não consegui criar o usuário do teste: ${res.status} ${res.body}`);
  }
  return { email };
}

// o que cada usuário virtual repete sem parar
export default function ({ email }) {
  group('busca', () => {
    const termo = TERMOS[Math.floor(Math.random() * TERMOS.length)];
    const res = http.get(`${BASE_URL}/rest/products/search?q=${termo}`, {
      tags: { name: 'busca' },
    });
    check(res, {
      'busca: status 200': (r) => r.status === 200,
      'busca: devolve uma lista': (r) => r.status === 200 && Array.isArray(r.json('data')),
    });
  });

  sleep(1); // tempo de "pensar" entre uma ação e outra, como uma pessoa faria

  group('login', () => {
    const res = http.post(
      `${BASE_URL}/rest/user/login`,
      JSON.stringify({ email, password: SENHA }),
      { headers: JSON_HEADERS, tags: { name: 'login' } },
    );
    check(res, {
      'login: status 200': (r) => r.status === 200,
      'login: devolve token': (r) => r.status === 200 && !!r.json('authentication.token'),
    });
  });

  sleep(1);
}