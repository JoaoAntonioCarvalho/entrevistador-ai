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
    <header className="border-b border-border bg-background px-6 py-4
                       transition-colors duration-200 sticky top-0 z-40">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between">

        <button
          onClick={() => router.push('/')}
          className="text-[15px] font-semibold tracking-tight text-foreground
                     hover:opacity-70 transition-opacity duration-150"
        >
          Entrevistador.IA
        </button>

        <div className="flex items-center gap-4">

          {backTo && (
            <button
              onClick={() => router.push(backTo)}
              className="text-sm text-muted-fg hover:text-foreground
                         transition-colors duration-150 hidden md:block"
            >
              {backLabel ?? '← Voltar'}
            </button>
          )}

          {rightContent}

          {mounted ? (
            <>
              {!loading && (
                user ? (
                  <button
                    onClick={signOut}
                    className="text-sm text-muted-fg hover:text-foreground
                               transition-colors duration-150 hidden md:block"
                  >
                    Sair
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/entrar')}
                    className="text-sm text-muted-fg hover:text-foreground
                               transition-colors duration-150 hidden md:block"
                  >
                    Entrar
                  </button>
                )
              )}

              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center
                           rounded-full border border-border text-muted-fg
                           hover:text-foreground hover:bg-muted
                           transition-all duration-150"
                aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {isDark
                  ? <Sun  className="w-3.5 h-3.5" />
                  : <Moon className="w-3.5 h-3.5" />
                }
              </button>
            </>
          ) : (
            <div className="w-8 h-8" />
          )}

        </div>
      </div>
    </header>
  );
}
