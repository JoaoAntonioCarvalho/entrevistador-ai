'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import {
  CreditCard, Clock, CheckCircle,
  AlertCircle, ChevronRight, Plus
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Credito {
  id:          string;
  tipo:        string;
  perguntas:   number;
  usado:       boolean;
  expires_at:  string | null;
  created_at:  string;
}

interface Pagamento {
  id:             string;
  plano:          string;
  status:         string;
  created_at:     string;
  mp_payment_id:  string | null;
}

interface Resumo {
  creditosDisponiveis: Credito[];
  creditosUsados:      Credito[];
  pagamentos:          Pagamento[];
  totalEntrevistas:    number;
}

const PLANO_LABEL: Record<string, string> = {
  'finalizar-atual':  'Finalizar entrevista (7 perguntas)',
  'credito-7':        '1 entrevista — 7 perguntas',
  'credito-14':       '1 entrevista — 14 perguntas',
  'mensal-starter':   'Plano Starter (6×7 perguntas)',
  'mensal-pro':       'Plano Pro (6×14 perguntas)',
};

const PLANO_PRECO: Record<string, string> = {
  'finalizar-atual':  'R$9,90',
  'credito-7':        'R$12,90',
  'credito-14':       'R$22,90',
  'mensal-starter':   'R$39,90',
  'mensal-pro':       'R$59,90',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

export default function ContaPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router  = useRouter();
  const [resumo,  setResumo]  = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      router.replace('/entrar?return=/conta');
      return;
    }

    fetch('/api/conta/resumo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId: user.id }),
    })
      .then(r => r.json())
      .then(setResumo)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-zinc-300
                          border-t-zinc-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const disponivel = resumo?.creditosDisponiveis ?? [];
  const pagamentos = resumo?.pagamentos ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header da página */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900
                           dark:text-white">
              Minha conta
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut().then(() => router.push('/'))}
            className="text-sm text-zinc-400 hover:text-zinc-600
                       dark:hover:text-zinc-300 transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: 'Créditos disponíveis',
              value: disponivel.length,
              icon:  <CreditCard className="w-4 h-4" />,
              cor:   disponivel.length > 0
                       ? 'text-emerald-600 dark:text-emerald-400'
                       : 'text-zinc-400',
            },
            {
              label: 'Entrevistas feitas',
              value: resumo?.totalEntrevistas ?? 0,
              icon:  <CheckCircle className="w-4 h-4" />,
              cor:   'text-zinc-900 dark:text-white',
            },
            {
              label: 'Entrevistas usadas',
              value: resumo?.creditosUsados?.length ?? 0,
              icon:  <Clock className="w-4 h-4" />,
              cor:   'text-zinc-400',
            },
          ].map(({ label, value, icon, cor }) => (
            <div key={label}
                 className="bg-white dark:bg-zinc-900 rounded-xl
                            border border-zinc-200 dark:border-zinc-800
                            p-4">
              <div className={`${cor} mb-2`}>{icon}</div>
              <p className={`text-2xl font-bold ${cor} mb-0.5`}>
                {value}
              </p>
              <p className="text-xs text-zinc-400 leading-tight">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Créditos disponíveis */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl
                        border border-zinc-200 dark:border-zinc-800
                        mb-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100
                          dark:border-zinc-800 flex items-center
                          justify-between">
            <h2 className="text-sm font-semibold text-zinc-900
                           dark:text-white">
              Créditos disponíveis
            </h2>
            <Link href="/planos"
              className="flex items-center gap-1 text-xs font-medium
                         text-zinc-500 hover:text-zinc-700
                         dark:hover:text-zinc-300 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Link>
          </div>

          {disponivel.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <AlertCircle className="w-8 h-8 text-zinc-300
                                       dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                Você não tem créditos disponíveis
              </p>
              <Link href="/planos"
                className="inline-flex items-center gap-1.5 bg-zinc-900
                           dark:bg-white text-white dark:text-zinc-900
                           text-xs font-semibold px-4 py-2 rounded-full
                           hover:bg-zinc-700 dark:hover:bg-zinc-100
                           transition-colors">
                Ver planos
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {disponivel.map(c => (
                <div key={c.id}
                     className="px-5 py-3.5 flex items-center
                                justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50
                                    dark:bg-emerald-900/20 rounded-full
                                    flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-600
                                              dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900
                                    dark:text-white">
                        {c.perguntas} perguntas
                      </p>
                      <p className="text-xs text-zinc-400">
                        {PLANO_LABEL[c.tipo] ?? c.tipo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {c.expires_at ? (
                      <p className="text-xs text-amber-500">
                        Expira {formatDate(c.expires_at)}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        Sem expiração
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA fazer entrevista */}
        {disponivel.length > 0 && (
          <Link href="/setup"
            className="flex items-center justify-between w-full
                       bg-zinc-900 dark:bg-white text-white
                       dark:text-zinc-900 px-5 py-4 rounded-2xl
                       hover:bg-zinc-700 dark:hover:bg-zinc-100
                       transition-colors mb-4 group">
            <div>
              <p className="text-sm font-semibold">
                Fazer entrevista
              </p>
              <p className="text-xs opacity-60 mt-0.5">
                {disponivel.length} crédito{disponivel.length > 1 ? 's' : ''} disponível{disponivel.length > 1 ? 'is' : ''}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60
                                      group-hover:opacity-100
                                      transition-opacity" />
          </Link>
        )}

        {/* Histórico de pagamentos */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl
                        border border-zinc-200 dark:border-zinc-800
                        overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100
                          dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900
                           dark:text-white">
              Histórico de pagamentos
            </h2>
          </div>

          {pagamentos.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-zinc-400">
                Nenhum pagamento encontrado
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100
                            dark:divide-zinc-800">
              {pagamentos.map(p => (
                <div key={p.id}
                     className="px-5 py-3.5 flex items-center
                                justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900
                                  dark:text-white">
                      {PLANO_LABEL[p.plano] ?? p.plano}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-zinc-900
                                  dark:text-white">
                      {PLANO_PRECO[p.plano] ?? '—'}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5
                                      rounded-full
                      ${p.status === 'approved'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : p.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                      {p.status === 'approved' ? 'PAGO'
                        : p.status === 'pending' ? 'PENDENTE'
                        : p.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links legais */}
        <div className="flex items-center justify-center gap-4
                        mt-8 text-xs text-zinc-400">
          <Link href="/termos"
            className="hover:text-zinc-600 transition-colors">
            Termos de Uso
          </Link>
          <span>·</span>
          <Link href="/privacidade"
            className="hover:text-zinc-600 transition-colors">
            Privacidade
          </Link>
          <span>·</span>
          <a href="mailto:suporte@entrevistador-ia.com.br"
             className="hover:text-zinc-600 transition-colors">
            Suporte
          </a>
        </div>

      </div>
    </div>
  );
}
