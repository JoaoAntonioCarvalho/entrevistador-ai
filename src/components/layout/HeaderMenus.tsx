'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';

// Fecha o menu ao clicar/tocar fora do container
function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  enabled: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, enabled, onOutside]);
}

// ── Dropdown de conta (desktop, usuário logado) ─────────────────────────────

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => setOpen(false));

  const itemClass =
    'block px-4 py-2 text-sm text-muted-fg hover:text-foreground ' +
    'hover:bg-muted transition-colors duration-150';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm text-muted-fg
                   hover:text-foreground transition-colors duration-150"
        aria-expanded={open}
      >
        Minha conta
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 bg-background
                     border border-border rounded-lg shadow-lg py-1.5 z-50"
        >
          <Link href="/conta" onClick={() => setOpen(false)} className={itemClass}>
            Minha conta
          </Link>
          <Link href="/historico" onClick={() => setOpen(false)} className={itemClass}>
            Histórico
          </Link>
          <Link href="/conta" onClick={() => setOpen(false)} className={itemClass}>
            Meus créditos
          </Link>
          <div className="h-px bg-border my-1.5" />
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className={`${itemClass} w-full text-left`}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

// ── Menu hambúrguer (mobile) ────────────────────────────────────────────────
// Renderizar dentro de um <header> posicionado (fixed/sticky): o painel usa
// absolute top-full para ocupar a largura toda abaixo do header.

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { open: openAuth } = useAuthModal();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => setOpen(false));

  // Âncoras funcionam direto na landing; nas demais páginas voltam para /
  const anchorHref = (id: string) => (pathname === '/' ? `#${id}` : `/#${id}`);
  const close = () => setOpen(false);

  // ≥16px (text-base) e py-3: Regra Crítica 9 + área de toque generosa
  const itemClass =
    'block w-full text-left px-6 py-3 text-base text-foreground ' +
    'hover:bg-muted transition-colors duration-150';
  const divider = <div className="h-px bg-border my-2" />;

  const anchors = (
    <>
      <a href={anchorHref('como-funciona')} onClick={close} className={itemClass}>
        Como funciona
      </a>
      <a href={anchorHref('recursos')} onClick={close} className={itemClass}>
        Recursos
      </a>
      <a href={anchorHref('faq')} onClick={close} className={itemClass}>
        FAQ
      </a>
    </>
  );

  return (
    <div ref={ref} className="md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-full
                   border border-border text-muted-fg hover:text-foreground
                   hover:bg-muted transition-all duration-150"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {open && (
        <nav
          className="absolute top-full left-0 right-0 bg-background
                     border-b border-border shadow-lg py-2
                     animate-fade-in-up"
          style={{ animationDuration: '0.2s' }}
          aria-label="Menu de navegação"
        >
          {!loading && (user ? (
            <>
              <Link href="/conta" onClick={close} className={itemClass}>
                Minha conta
              </Link>
              <Link href="/historico" onClick={close} className={itemClass}>
                Histórico
              </Link>
              <Link href="/conta" onClick={close} className={itemClass}>
                Meus créditos
              </Link>
              <Link href="/planos" onClick={close} className={itemClass}>
                Planos
              </Link>
              {divider}
              {anchors}
              {divider}
              <button
                onClick={() => {
                  close();
                  signOut();
                }}
                className={`${itemClass} text-muted-fg`}
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  close();
                  openAuth();
                }}
                className={itemClass}
              >
                Entrar
              </button>
              <Link href="/planos" onClick={close} className={itemClass}>
                Planos
              </Link>
              {divider}
              {anchors}
            </>
          ))}
        </nav>
      )}
    </div>
  );
}
