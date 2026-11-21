import { APIRequestContext, expect } from '@playwright/test';
import { authHeader, LoggedUser } from './auth';

export async function createCard(request: APIRequestContext, user: LoggedUser): Promise<number> {
  const res = await request.post('/api/Cards/', {
    headers: authHeader(user.token),
    data: { fullName: 'QA Teste', cardNum: 4111111111111111, expMonth: 12, expYear: 2090 },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

export function addBalance(
  request: APIRequestContext,
  user: LoggedUser,
  paymentId: number,
  balance: number,
) {
  return request.put('/rest/wallet/balance', {
    headers: authHeader(user.token),
    data: { balance, paymentId },
  });
}

export async function getBalance(request: APIRequestContext, user: LoggedUser): Promise<number> {
  const res = await request.get('/rest/wallet/balance', {
    headers: authHeader(user.token),
  });
  expect(res.status()).toBe(200);
  return (await res.json()).data;
}