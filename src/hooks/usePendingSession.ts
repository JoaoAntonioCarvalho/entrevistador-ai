'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface PendingSession {
  sessionId:  string;
  jobTitulo:  string;
  jobEmpresa: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config:     any;
  createdAt:  string;
}

export function usePendingSession() {
  const { user } = useAuth();
  const userId   = user?.id ?? null;
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPending(null);
      setChecked(true);
      return;
    }

    async function check() {
      setLoading(true);
      try {
        const res = await fetch('/api/session/pending', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authUserId: userId }),
        });
        const data = await res.json();

        setPending(data.hasPending ? {
          sessionId:  data.sessionId,
          jobTitulo:  data.jobTitulo,
          jobEmpresa: data.jobEmpresa,
          config:     data.config,
          createdAt:  data.createdAt,
        } : null);
      } catch {
        setPending(null);
      } finally {
        setLoading(false);
        setChecked(true);
      }
    }

    check();
  }, [userId]);

  return { pending, loading, checked };
}
