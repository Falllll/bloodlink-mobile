import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { flushQueue, listQueue, onQueueChange } from '@/lib/api/queue';
import { onOnline, useOnline } from '@/lib/net/status';
import { useSession } from '@/lib/auth/session';

type OfflineState = {
  online: boolean;
  pending: number;
  flushing: boolean;
  flushNow: () => Promise<void>;
};

const OfflineContext = createContext<OfflineState | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);
  // Refs, not state: the guards must hold even when two triggers land in the same tick.
  const flushingRef = useRef(false);
  const signedInRef = useRef(status === 'signed-in');

  useEffect(() => {
    signedInRef.current = status === 'signed-in';
  }, [status]);

  const refreshPending = useCallback(async () => {
    setPending((await listQueue()).length);
  }, []);

  useEffect(() => {
    void refreshPending();
    return onQueueChange(() => void refreshPending());
  }, [refreshPending]);

  const flushNow = useCallback(async () => {
    if (!signedInRef.current || flushingRef.current) return;
    flushingRef.current = true;
    setFlushing(true);
    try {
      await flushQueue();
    } finally {
      flushingRef.current = false;
      setFlushing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    const subscription = onOnline(() => void flushNow());
    return () => subscription.remove();
  }, [flushNow]);

  // Retry rows on their own backoff schedule, and drain rows left over from a previous
  // launch, without waiting for the network to toggle. Re-armed after every flush.
  useEffect(() => {
    if (!online || status !== 'signed-in' || flushing || pending === 0) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    void listQueue().then((rows) => {
      if (cancelled || rows.length === 0) return;
      const due = Math.min(...rows.map((row) => row.nextAttemptAt));
      timer = setTimeout(() => void flushNow(), Math.max(0, due - Date.now()));
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [online, status, flushing, pending, flushNow]);

  return (
    <OfflineContext.Provider value={{ online, pending, flushing, flushNow }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineState {
  const value = useContext(OfflineContext);
  if (!value) throw new Error('useOffline must be used within an OfflineProvider');
  return value;
}
