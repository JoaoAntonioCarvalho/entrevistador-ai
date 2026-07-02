'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authedFetch } from '@/lib/services/api-client';

export function useCredits() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [creditInfo, setCreditInfo] = useState<{
    hasAnyCredit: boolean;
    maxPerguntas: number;
    loading: boolean;
  }>({ hasAnyCredit: false, maxPerguntas: 0, loading: true });

  useEffect(() => {
    if (!userId) {
      setCreditInfo({ hasAnyCredit: false, maxPerguntas: 0, loading: false });
      return;
    }

    async function checkCredits() {
      try {
        const res = await authedFetch('/api/credits/check', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: null }),
        });
        const data = await res.json();
        setCreditInfo({
          hasAnyCredit: data.hasCredit,
          maxPerguntas: data.perguntas ?? 0,
          loading: false,
        });
      } catch {
        setCreditInfo({ hasAnyCredit: false, maxPerguntas: 0, loading: false });
      }
    }

    checkCredits();
  }, [userId]);

  return creditInfo;
}
