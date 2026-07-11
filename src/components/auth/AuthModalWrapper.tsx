'use client'

import { AuthModal } from '@/components/auth/AuthModal';
import { useAuthModal } from '@/hooks/useAuthModal';

export function AuthModalWrapper() {
  const { isOpen, motivo, onSuccess, returnTo, onBeforeRedirectToAuth, close } = useAuthModal();

  return (
    <AuthModal
      isOpen={isOpen}
      onClose={close}
      motivo={motivo || undefined}
      onSuccess={onSuccess ?? undefined}
      returnTo={returnTo}
      onBeforeRedirectToAuth={onBeforeRedirectToAuth ?? undefined}
    />
  );
}
