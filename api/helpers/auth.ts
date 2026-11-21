import { APIRequestContext, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

export const PASSWORD = 'Senha@12345';

export interface LoggedUser {
  id: number;
  email: string;
  token: string;
  basketId: number;
}

export async function createUser(request: APIRequestContext) {
  const email = `qa-${randomUUID()}@example.com`;
  const res = await request.post('/api/Users/', {
    data: {
      email,
      password: PASSWORD,
      passwordRepeat: PASSWORD,
      securityQuestion: { id: 1, question: 'Your eldest siblings middle name?' },
      securityAnswer: 'teste',
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { id: body.data.id as number, email };
}

export async function login(request: APIRequestContext, email: string, password = PASSWORD) {
  const res = await request.post('/rest/user/login', { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    token: body.authentication.token as string,
    basketId: body.authentication.bid as number,
  };
}

export async function createLoggedUser(request: APIRequestContext): Promise<LoggedUser> {
  const { id, email } = await createUser(request);
  const { token, basketId } = await login(request, email);
  return { id, email, token, basketId };
}

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });