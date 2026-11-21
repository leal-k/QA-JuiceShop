import { APIRequestContext } from '@playwright/test';
import { authHeader, LoggedUser } from './auth';

export function addItem(
  request: APIRequestContext,
  user: LoggedUser,
  productId: number,
  quantity: number,
) {
  return request.post('/api/BasketItems/', {
    headers: authHeader(user.token),
    data: { ProductId: productId, BasketId: String(user.basketId), quantity },
  });
}

export function changeQuantity(
  request: APIRequestContext,
  user: LoggedUser,
  itemId: number,
  quantity: number,
) {
  return request.put(`/api/BasketItems/${itemId}`, {
    headers: authHeader(user.token),
    data: { quantity },
  });
}

export function getItem(request: APIRequestContext, user: LoggedUser, itemId: number) {
  return request.get(`/api/BasketItems/${itemId}`, {
    headers: authHeader(user.token),
  });
}