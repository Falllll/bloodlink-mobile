import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { apiFetch, newIdempotencyKey, setUnauthorizedHandler } from '@/lib/api/client';
import type { ApiSuccess, AuthToken } from '@/lib/api/types';
import { clearToken, readToken, writeToken } from '@/lib/auth/token';

type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

type Session = {
  status: SessionStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    setUnauthorizedHandler(() => setStatus('signed-out'));
    readToken().then((token) => setStatus(token ? 'signed-in' : 'signed-out'));
  }, []);

  async function signIn(email: string, password: string): Promise<void> {
    const key = newIdempotencyKey();
    const { data } = await apiFetch<ApiSuccess<AuthToken>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Idempotency-Key': key },
    });
    await writeToken(data.token);
    setStatus('signed-in');
  }

  async function signOut(): Promise<void> {
    const key = newIdempotencyKey();
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
      });
    } catch {
      // ignore
    }
    await clearToken();
    setStatus('signed-out');
  }

  return (
    <SessionContext.Provider value={{ status, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return session;
}
