'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/services/supabase-client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string) {
    const supabase = createClient();
    if (!supabase) return { error: new Error('Client not available') };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }

  async function signIn(email: string, password: string) {
    const supabase = createClient();
    if (!supabase) return { error: new Error('Client not available') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    if (!supabase) return { error: new Error('Client not available') };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }

  async function signOut() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return { user, loading, signUp, signIn, signInWithGoogle, signOut };
}
