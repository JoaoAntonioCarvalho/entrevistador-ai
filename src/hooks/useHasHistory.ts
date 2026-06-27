'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useHasHistory() {
  const { user, loading: authLoading } = useAuth();
  const [hasHistory, setHasHistory] = useState(false);
  const [count,      setCount]      = useState(0);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setHasHistory(false);
      setLoading(false);
      return;
    }

    fetch('/api/session/has-history', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ authUserId: user.id }),
    })
      .then(r => r.json())
      .then(data => {
        setHasHistory(data.hasHistory ?? false);
        setCount(data.count ?? 0);
      })
      .catch(() => setHasHistory(false))
      .finally(() => setLoading(false));
  }, [user?.id, authLoading]);

  return { hasHistory, count, loading };
}
