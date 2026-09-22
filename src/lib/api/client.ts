import { randomUUID } from 'expo-crypto';

import type { ApiError } from '@/lib/api/types';
import { clearToken, readToken } from '@/lib/auth/token';

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

let onUnauthorized: () => void = () => {};

export class ApiFailure extends Error {
  constructor(public readonly status: number, public readonly body: ApiError) {
    super(body.error.code);
  }
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function newIdempotencyKey(): string {
  return randomUUID();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not set');
  }

  const token = await readToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(BASE + path, { ...init, headers });

  if (res.status === 401) {
    await clearToken();
    onUnauthorized();
    throw new ApiFailure(res.status, await res.json());
  }

  if (!res.ok) {
    throw new ApiFailure(res.status, await res.json());
  }

  return (await res.json()) as T;
}
