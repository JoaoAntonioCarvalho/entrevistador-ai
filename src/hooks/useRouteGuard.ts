'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';

interface RouteGuardOptions {
  needsCandidate?: boolean;
  needsJob?: boolean;
  needsEvaluations?: boolean;
  needsScores?: boolean;
}

export function useRouteGuard(options: RouteGuardOptions) {
  const router = useRouter();
  const { session } = useSessionStore();

  useEffect(() => {
    if (options.needsCandidate && !session.candidate) {
      router.push('/setup');
      return;
    }
    if (options.needsJob && !session.job) {
      router.push('/setup');
      return;
    }
    if (options.needsEvaluations && session.evaluations.length === 0) {
      router.push('/setup');
      return;
    }
    if (options.needsScores && !session.scores) {
      router.push('/setup');
      return;
    }
  // options is an object literal — stringify to stabilize the dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router]);
}
