'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';

interface RouteGuardOptions {
  needsCandidate?: boolean;
  needsJob?:       boolean;
  needsEvaluations?: boolean;
  needsScores?:    boolean;
  requireAuth?:    boolean;
}

export function useRouteGuard(options: RouteGuardOptions) {
  const router   = useRouter();
  const pathname = usePathname();
  const { session } = useSessionStore();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (options.requireAuth) {
      if (loading) return;
      if (!user) {
        router.replace(`/entrar?return=${encodeURIComponent(pathname)}`);
        return;
      }
    }

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
  }, [session, router, user, loading, pathname]);
}
