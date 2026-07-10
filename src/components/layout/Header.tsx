'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AccountMenu, MobileMenu } from '@/components/layout/HeaderMenus';

interface HeaderProps {
  backTo?:       string;
  backLabel?:    string;
  rightContent?: React.ReactNode;
}

export function Header({ backTo, backLabel, rightContent }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const { open } = useAuthModal();

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
          className="flex items-center gap-2 text-[15px] font-semibold
                     tracking-tight text-foreground
                     hover:opacity-70 transition-opacity duration-150"
        >
          <Image
            src={mounted && isDark ? '/icon-mono-white-transparent.png' : '/icon-mono-transparent.png'}
            alt="Entrevistador.IA"
            width={28}
            height={28}
            className="w-7 h-7 md:w-6 md:h-6"
            priority
          />
          <span className="hidden md:inline">Entrevistador.IA</span>
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
                  <div className="hidden md:block">
                    <AccountMenu />
                  </div>
                ) : (
                  <button
                    onClick={() => open()}
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

              <MobileMenu />
            </>
          ) : (
            <div className="w-8 h-8" />
          )}

        </div>
      </div>
    </header>
  );
}
