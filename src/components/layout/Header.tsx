'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  backTo?:       string;
  backLabel?:    string;
  rightContent?: React.ReactNode;
}

export function Header({ backTo, backLabel, rightContent }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = resolvedTheme ?? theme;
  const isDark = currentTheme === 'dark';

  function toggleTheme() {
    setTheme(isDark ? 'light' : 'dark');
  }

  return (
    <header className="border-b border-zinc-100 dark:border-zinc-800
                       bg-white dark:bg-zinc-950 px-6 py-4
                       transition-colors duration-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white
                     hover:opacity-70 transition-opacity"
        >
          Entrevistador.ai
        </button>

        {/* Direita */}
        <div className="flex items-center gap-3">

          {backTo && (
            <button
              onClick={() => router.push(backTo)}
              className="text-sm text-zinc-500 dark:text-zinc-400
                         hover:text-zinc-700 dark:hover:text-zinc-200
                         transition-colors hidden md:block"
            >
              {backLabel ?? '← Voltar'}
            </button>
          )}

          {rightContent}

          {/* Auth + Toggle — só renderiza após montar para evitar hydration mismatch */}
          {mounted ? (
            <>
              {!loading && (
                user ? (
                  <button
                    onClick={signOut}
                    className="text-sm text-zinc-500 dark:text-zinc-400
                               hover:text-zinc-700 dark:hover:text-zinc-200
                               transition-colors hidden md:block"
                  >
                    Sair
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/entrar')}
                    className="text-sm text-zinc-500 dark:text-zinc-400
                               hover:text-zinc-700 dark:hover:text-zinc-200
                               transition-colors hidden md:block"
                  >
                    Entrar
                  </button>
                )
              )}

              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center
                           rounded-full border border-zinc-200 dark:border-zinc-700
                           text-zinc-500 dark:text-zinc-400
                           hover:bg-zinc-50 dark:hover:bg-zinc-800
                           transition-all duration-200"
                aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {isDark
                  ? <Sun  className="w-4 h-4" />
                  : <Moon className="w-4 h-4" />
                }
              </button>
            </>
          ) : (
            <div className="w-9 h-9" />
          )}

        </div>
      </div>
    </header>
  );
}
