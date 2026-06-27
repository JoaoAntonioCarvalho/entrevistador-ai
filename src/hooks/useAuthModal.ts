'use client'

import { create } from 'zustand';

interface AuthModalStore {
  isOpen:    boolean;
  motivo:    string;
  onSuccess: (() => void) | null;
  open: (opts?: {
    motivo?:    string;
    onSuccess?: () => void;
  }) => void;
  close: () => void;
}

export const useAuthModal = create<AuthModalStore>(set => ({
  isOpen:    false,
  motivo:    '',
  onSuccess: null,
  open: (opts = {}) => set({
    isOpen:    true,
    motivo:    opts.motivo    ?? '',
    onSuccess: opts.onSuccess ?? null,
  }),
  close: () => set({ isOpen: false }),
}));
