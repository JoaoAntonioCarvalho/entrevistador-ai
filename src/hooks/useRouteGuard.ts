'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';

interface RouteGuardOptions {
  needsCandidate?:   boolean;
  needsJob?:         boolean;
  needsEvaluations?: boolean;
  needsScores?:      boolean;
  requireAuth?:      boolean;
}

export function useRouteGuard(options: RouteGuardOptions) {
  const router   = useRouter();
  const pathname = usePathname();
  const { session } = useSessionStore();
  const { user, loading } = useAuth();
  const { open } = useAuthModal();

  useEffect(() => {
    if (options.requireAuth) {
      if (loading) return;
      if (!user) {
        open({ motivo: 'Para acessar esta página' });
        return;
      }
    }

    const isResuming = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('resume') === 'true'
      : false;

    if (options.needsCandidate && !session.candidate && !isResuming) {
      router.push('/setup');
      return;
    }
    if (options.needsJob && !session.job && !isResuming) {
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
  }, [session, router, user, loading, pathname, open]);
}
