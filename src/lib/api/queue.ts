import { ApiFailure, NetworkUnavailable, apiFetch } from '@/lib/api/client';
import type { ErrorCode } from '@/lib/api/types';
import { listKeys, readJson, removeKey, writeJson } from '@/lib/storage/kv';

export type QueuedMutation = {
  id: string;                 // sama persis dengan idempotencyKey
  path: string;
  method: 'POST' | 'PATCH' | 'PUT';
  body: unknown;
  idempotencyKey: string;
  attempts: number;
  nextAttemptAt: number;      // epoch ms
  createdAt: number;
  lastError: ErrorCode | 'NETWORK_UNAVAILABLE' | null;
};

export const MAX_ATTEMPTS = 5;

const RETRYABLE: ReadonlySet<string> = new Set([
  'NETWORK_UNAVAILABLE', 'REQUEST_IN_PROGRESS', 'TOO_MANY_REQUESTS', 'INTERNAL_ERROR',
]);

const listeners = new Set<() => void>();

/** Notifies when a row is added, rewritten or dropped, so the banner count stays live. */
export function onQueueChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyQueueChange(): void {
  listeners.forEach((listener) => listener());
}

export type QueueOutcome = {
  id: string;                 // the row's idempotencyKey
  outcome: 'sent' | 'failed';
  error: ApiFailure | null;   // set when a permanent failure came back from the API
};

const outcomeListeners = new Set<(result: QueueOutcome) => void>();

/**
 * Reports the final outcome of each row flushQueue settles (sent, or dropped as failed).
 *
 * useOptimisticMutation listens here to roll back its optimistic row when a queued
 * mutation fails permanently. That rollback deliberately does NOT survive an app
 * restart: the optimistic row lives only in the caller's React state (apply() has no
 * way to write into the persisted GET cache), so a restart already discards it and
 * there is nothing left to undo. Only the queue row itself is persisted.
 */
export function onQueueOutcome(listener: (result: QueueOutcome) => void): () => void {
  outcomeListeners.add(listener);
  return () => {
    outcomeListeners.delete(listener);
  };
}

function notifyOutcome(result: QueueOutcome): void {
  outcomeListeners.forEach((listener) => listener(result));
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkUnavailable) return true;
  if (error instanceof ApiFailure) return RETRYABLE.has(error.body?.error?.code);
  return false;
}

export function backoffMs(attempts: number): number {
  return Math.min(2 ** attempts * 1000, 60000) + Math.floor(Math.random() * 251);
}

export async function enqueue(
  input: Pick<QueuedMutation, 'path' | 'method' | 'body' | 'idempotencyKey'>,
): Promise<QueuedMutation> {
  const now = Date.now();
  const row: QueuedMutation = {
    ...input,
    id: input.idempotencyKey,
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    lastError: null,
  };
  await writeJson(`queue:${row.id}`, row);
  notifyQueueChange();
  return row;
}

export async function listQueue(): Promise<QueuedMutation[]> {
  const keys = await listKeys('queue:');
  const rows = await Promise.all(keys.map((key) => readJson<QueuedMutation>(key)));
  return rows
    .filter((row): row is QueuedMutation => row !== null)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function dropFromQueue(id: string): Promise<void> {
  await removeKey(`queue:${id}`);
  notifyQueueChange();
}

function errorCodeOf(error: unknown): QueuedMutation['lastError'] {
  if (error instanceof NetworkUnavailable) return 'NETWORK_UNAVAILABLE';
  if (error instanceof ApiFailure) return error.body?.error?.code ?? null;
  return null;
}

export async function flushQueue(): Promise<{ sent: number; failed: number; left: number }> {
  let sent = 0;
  let failed = 0;

  for (const row of await listQueue()) {
    if (row.nextAttemptAt > Date.now()) continue;

    try {
      await apiFetch(row.path, {
        method: row.method,
        body: JSON.stringify(row.body),
        // The key stored on the row, never a fresh one: a new key per retry makes the
        // backend treat every retry as a new action and create duplicate rows.
        headers: { 'Idempotency-Key': row.idempotencyKey },
      });
      await dropFromQueue(row.id);
      sent += 1;
      notifyOutcome({ id: row.id, outcome: 'sent', error: null });
    } catch (error) {
      const attempts = row.attempts + 1;

      if (!isRetryable(error) || attempts >= MAX_ATTEMPTS) {
        await dropFromQueue(row.id);
        failed += 1;
        notifyOutcome({
          id: row.id,
          outcome: 'failed',
          error: error instanceof ApiFailure ? error : null,
        });
      } else {
        await writeJson(`queue:${row.id}`, {
          ...row,
          attempts,
          nextAttemptAt: Date.now() + backoffMs(attempts),
          lastError: errorCodeOf(error),
        } satisfies QueuedMutation);
      }

      if (error instanceof NetworkUnavailable) break; // network is down, the rest would fail too
    }
  }

  const left = (await listQueue()).length;
  return { sent, failed, left };
}
