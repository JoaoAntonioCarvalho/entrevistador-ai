'use client'

import { create } from 'zustand';

interface AuthModalStore {
  isOpen:                  boolean;
  motivo:                  string;
  onSuccess:               (() => void) | null;
  returnTo:                string | undefined;
  onBeforeRedirectToAuth:  (() => void) | null;
  open: (opts?: {
    motivo?:                 string;
    onSuccess?:              () => void;
    returnTo?:               string;
    onBeforeRedirectToAuth?: () => void;
  }) => void;
  close: () => void;
}

export const useAuthModal = create<AuthModalStore>(set => ({
  isOpen:                 false,
  motivo:                 '',
  onSuccess:              null,
  returnTo:               undefined,
  onBeforeRedirectToAuth: null,
  open: (opts = {}) => set({
    isOpen:                 true,
    motivo:                 opts.motivo    ?? '',
    onSuccess:              opts.onSuccess ?? null,
    returnTo:               opts.returnTo,
    onBeforeRedirectToAuth: opts.onBeforeRedirectToAuth ?? null,
  }),
  close: () => set({ isOpen: false }),
}));
