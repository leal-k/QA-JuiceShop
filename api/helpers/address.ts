import { APIRequestContext, expect } from '@playwright/test';
import { authHeader, LoggedUser } from './auth';

export async function createAddress(request: APIRequestContext, user: LoggedUser) {
  const res = await request.post('/api/Addresss/', {
    headers: authHeader(user.token),
    data: {
      country: 'Brasil',
      fullName: 'QA Teste',
      mobileNum: 5551234567,
      zipCode: '12345',
      streetAddress: 'Rua dos Testes, 100',
      city: 'Cidade Teste',
      state: 'TS',
    },
  });
  expect(res.status()).toBe(201);
}