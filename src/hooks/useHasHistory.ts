'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authedFetch } from '@/lib/services/api-client';

export function useHasHistory() {
  const { user, loading: authLoading } = useAuth();
  const [hasHistory, setHasHistory] = useState(false);
  const [hasCredit,  setHasCredit]  = useState(false);
  const [count,      setCount]      = useState(0);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setHasHistory(false);
      setHasCredit(false);
      setLoading(false);
      return;
    }

    Promise.all([
      authedFetch('/api/session/has-history', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      }).then(r => r.json()).catch(() => ({ hasHistory: false, count: 0 })),
      authedFetch('/api/credits/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId: null }),
      }).then(r => r.json()).catch(() => ({ hasCredit: false })),
    ])
      .then(([historyData, creditCheck]) => {
        setHasHistory((historyData.hasHistory ?? false) || (creditCheck.hasCredit ?? false));
        setHasCredit(creditCheck.hasCredit ?? false);
        setCount(historyData.count ?? 0);
      })
      .catch(() => { setHasHistory(false); setHasCredit(false); })
      .finally(() => setLoading(false));
  }, [user?.id, authLoading]);

  return { hasHistory, hasCredit, count, loading };
}
