import { useEffect, useRef, useState } from 'react';

import { ApiFailure, apiFetch, newIdempotencyKey } from '@/lib/api/client';
import { enqueue, isRetryable, onQueueOutcome } from '@/lib/api/queue';
import { checkOnline } from '@/lib/net/status';

export type OptimisticState = 'idle' | 'pending' | 'queued' | 'done' | 'failed';

export type OptimisticMutationOptions<TVars> = {
  path: (vars: TVars) => string;
  method: 'POST' | 'PATCH' | 'PUT';
  body: (vars: TVars) => unknown;
  apply: (vars: TVars) => void;     // tulis baris optimistis ke state pemanggil
  rollback: (vars: TVars) => void;  // batalkan saat gagal permanen
};

export function useOptimisticMutation<TVars>(options: OptimisticMutationOptions<TVars>): {
  state: OptimisticState;
  error: ApiFailure | null;
  run: (vars: TVars) => Promise<void>;
} {
  const [state, setState] = useState<OptimisticState>('idle');
  const [error, setError] = useState<ApiFailure | null>(null);
  const optionsRef = useRef(options);
  // vars of each mutation this hook queued, keyed by idempotencyKey, so the queue's
  // outcome can be matched back to the optimistic row it has to keep or undo.
  const queuedRef = useRef(new Map<string, TVars>());
  const mounted = useRef(true);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    mounted.current = true;
    const queued = queuedRef.current;
    const unsubscribe = onQueueOutcome((result) => {
      const vars = queued.get(result.id);
      if (vars === undefined) return; // someone else's row
      queued.delete(result.id);
      if (result.outcome === 'sent') {
        setState('done');
        return;
      }
      optionsRef.current.rollback(vars);
      setError(result.error);
      setState('failed');
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, []);

  async function run(vars: TVars): Promise<void> {
    // One key per user action, created here and reused by every retry (direct or queued).
    const key = newIdempotencyKey();
    const { path, method, body, apply, rollback } = optionsRef.current;
    const request = { path: path(vars), method, body: body(vars), idempotencyKey: key };

    setError(null);
    setState('pending');
    apply(vars);

    const queueIt = async () => {
      queuedRef.current.set(key, vars);
      await enqueue(request);
      if (mounted.current) setState('queued');
    };

    if (!(await checkOnline())) {
      await queueIt();
      return;
    }

    try {
      await apiFetch(request.path, {
        method,
        body: JSON.stringify(request.body),
        headers: { 'Idempotency-Key': key },
      });
      if (mounted.current) setState('done');
    } catch (e) {
      if (isRetryable(e)) {
        await queueIt(); // same key: the server dedupes if the first attempt did land
        return;
      }
      rollback(vars);
      if (mounted.current) {
        setError(e instanceof ApiFailure ? e : null);
        setState('failed');
      }
    }
  }

  return { state, error, run };
}
