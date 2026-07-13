'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';
import { authedFetch } from '@/lib/services/api-client';
import { createClient } from '@/lib/services/supabase-client';
import { Header } from '@/components/layout/Header';
import { AlertCircle, Check, ChevronRight, Pencil, Plus, X } from 'lucide-react';

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

interface Assinatura {
  plano:              string;
  status:             string;
  perguntas:          number | null;
  current_period_end: string | null;
  updated_at:         string;
}

interface Resumo {
  creditosDisponiveis: Credito[];
  creditosUsados:      Credito[];
  pagamentos:          Pagamento[];
  totalEntrevistas:    number;
  assinatura:          Assinatura | null;
}

const PLANO_LABEL: Record<string, string> = {
  'finalizar-atual':  'Finalizar entrevista (7 perguntas)',
  'credito-7':        '1 entrevista — 7 perguntas',
  'credito-14':       '1 entrevista — 14 perguntas',
  'mensal-starter':   'Plano Starter (6×7 perguntas)',
  'mensal-pro':       'Plano Pro (6×14 perguntas)',
};

// Valores espelham PRECOS de mp-config.ts, que não pode ser importado no
// client (instancia MercadoPagoConfig com o access token no topo do módulo)
const PLANO_PRECO: Record<string, string> = {
  'finalizar-atual':  'R$5,90',
  'credito-7':        'R$8,90',
  'credito-14':       'R$12,90',
  'mensal-starter':   'R$39,90',
  'mensal-pro':       'R$59,90',
};

const PLANO_NOME: Record<string, string> = {
  'mensal-starter': 'Starter',
  'mensal-pro':     'Pro',
};

const STATUS_ASSINATURA: Record<string, { label: string; dot: string }> = {
  authorized: { label: 'Ativa',                  dot: 'bg-emerald-500' },
  pending:    { label: 'Aguardando pagamento',   dot: 'bg-amber-500'   },
  paused:     { label: 'Pausada',                dot: 'bg-amber-500'   },
  cancelled:  { label: 'Cancelada',              dot: 'bg-zinc-400'    },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day:   '2-digit',
    month: '2-digit',
  });
}

function badgePagamento(status: string): { label: string; cls: string } {
  if (status === 'approved') {
    return {
      label: 'Aprovado',
      cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    };
  }
  if (status === 'pending' || status === 'in_process') {
    return {
      label: 'Pendente',
      cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    };
  }
  if (status === 'rejected' || status === 'cancelled') {
    return {
      label: 'Recusado',
      cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };
  }
  return { label: status, cls: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' };
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05"
        d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title:     string;
  action?:   React.ReactNode;
  children:  React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-xl border
                        border-zinc-200 dark:border-zinc-800 mb-4
                        overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800
                      flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SkeletonRows({ rows = 2 }: { rows?: number }) {
  return (
    <div className="px-5 py-5 space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-2/5" />
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 text-base rounded-lg border border-zinc-200 ' +
  'dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 ' +
  'dark:text-white placeholder-zinc-400 focus:outline-none ' +
  'focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors';

export default function ContaPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { open } = useAuthModal();
  const router  = useRouter();

  const [resumo,        setResumo]        = useState<Resumo | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [erroResumo,    setErroResumo]    = useState(false);

  // ── Perfil ──
  const [nomeLocal,    setNomeLocal]    = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeDraft,    setNomeDraft]    = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [showSenha,    setShowSenha]    = useState(false);
  const [senha1,       setSenha1]       = useState('');
  const [senha2,       setSenha2]       = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; texto: string } | null>(null);

  // ── Assinatura ──
  const [modalCancelar, setModalCancelar] = useState(false);
  const [cancelando,    setCancelando]    = useState(false);

  function carregarResumo() {
    setErroResumo(false);
    return authedFetch('/api/conta/resumo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setResumo)
      .catch(() => setErroResumo(true));
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      open({ motivo: 'Para ver sua conta' });
      return;
    }
    carregarResumo().finally(() => setLoadingResumo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const nomeMetadata =
    (user?.user_metadata?.nome as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    '';
  const nome = nomeLocal ?? nomeMetadata;
  const inicial = (nome.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase();

  const isEmailAccount =
    user?.app_metadata?.provider === 'email' ||
    (user?.identities ?? []).some(i => i.provider === 'email');

  async function salvarNome() {
    const novoNome = nomeDraft.trim();
    if (!novoNome) return;
    setSalvandoNome(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error();
      // Exceção segura ao padrão "browser não fala com Supabase": auth do
      // próprio usuário via anon key
      const { error } = await supabase.auth.updateUser({ data: { nome: novoNome } });
      if (error) throw error;
      setNomeLocal(novoNome);
      setEditandoNome(false);
    } catch {
      /* mantém o modo de edição para tentar de novo */
    } finally {
      setSalvandoNome(false);
    }
  }

  async function salvarSenha() {
    setMsgSenha(null);
    if (senha1.length < 8) {
      setMsgSenha({ ok: false, texto: 'A senha precisa ter no mínimo 8 caracteres.' });
      return;
    }
    if (senha1 !== senha2) {
      setMsgSenha({ ok: false, texto: 'As senhas não coincidem.' });
      return;
    }
    setSalvandoSenha(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error();
      const { error } = await supabase.auth.updateUser({ password: senha1 });
      if (error) throw error;
      setMsgSenha({ ok: true, texto: 'Senha alterada com sucesso.' });
      setSenha1('');
      setSenha2('');
      setShowSenha(false);
    } catch {
      setMsgSenha({ ok: false, texto: 'Não foi possível alterar a senha. Tente novamente.' });
    } finally {
      setSalvandoSenha(false);
    }
  }

  async function cancelarAssinatura() {
    setCancelando(true);
    try {
      const res = await authedFetch('/api/subscription/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await carregarResumo();
      }
    } catch {
      /* silencioso */
    } finally {
      setCancelando(false);
      setModalCancelar(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-zinc-300
                          border-t-zinc-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const disponivel = resumo?.creditosDisponiveis ?? [];
  const pagamentos = (resumo?.pagamentos ?? []).slice(0, 10);
  const assinatura = resumo?.assinatura ?? null;
  const assinaturaAtiva =
    assinatura && ['authorized', 'pending', 'paused'].includes(assinatura.status);
  const creditosDoCiclo = assinatura
    ? disponivel.filter(c => c.tipo === assinatura.plano).length
    : 0;
  const statusInfo = assinatura
    ? STATUS_ASSINATURA[assinatura.status] ?? { label: assinatura.status, dot: 'bg-zinc-400' }
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="flex items-start justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Minha conta
          </h1>
          <button
            onClick={() => signOut().then(() => router.push('/'))}
            className="text-sm text-zinc-400 hover:text-zinc-600
                       dark:hover:text-zinc-300 transition-colors"
          >
            Sair
          </button>
        </div>

        {/* ── SEÇÃO 1 — PERFIL ─────────────────────────────────────────── */}
        <SectionCard title="Perfil">
          <div className="px-5 py-5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800
                              border border-zinc-200 dark:border-zinc-700
                              flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-zinc-600
                                 dark:text-zinc-300 select-none">
                  {inicial}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                {!editandoNome ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900
                                  dark:text-white truncate">
                      {nome || 'Sem nome definido'}
                    </p>
                    <button
                      onClick={() => {
                        setNomeDraft(nome);
                        setEditandoNome(true);
                      }}
                      className="text-zinc-400 hover:text-zinc-600
                                 dark:hover:text-zinc-300 transition-colors shrink-0"
                      aria-label="Editar nome"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nomeDraft}
                      onChange={e => setNomeDraft(e.target.value)}
                      placeholder="Seu nome"
                      autoFocus
                      maxLength={80}
                      className={inputClass}
                    />
                    <button
                      onClick={salvarNome}
                      disabled={salvandoNome || !nomeDraft.trim()}
                      className="shrink-0 w-8 h-8 flex items-center justify-center
                                 rounded-lg bg-zinc-900 dark:bg-white text-white
                                 dark:text-zinc-900 hover:opacity-90
                                 disabled:opacity-40 transition-opacity"
                      aria-label="Salvar nome"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditandoNome(false)}
                      disabled={salvandoNome}
                      className="shrink-0 w-8 h-8 flex items-center justify-center
                                 rounded-lg border border-zinc-200 dark:border-zinc-700
                                 text-zinc-400 hover:text-zinc-600
                                 dark:hover:text-zinc-300 transition-colors"
                      aria-label="Cancelar edição"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  O email não pode ser alterado
                </p>
              </div>
            </div>

            {/* Senha / provedor */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
              {isEmailAccount ? (
                <>
                  {!showSenha ? (
                    <button
                      onClick={() => {
                        setShowSenha(true);
                        setMsgSenha(null);
                      }}
                      className="text-sm text-zinc-500 hover:text-zinc-700
                                 dark:text-zinc-400 dark:hover:text-zinc-200
                                 transition-colors"
                    >
                      Alterar senha
                    </button>
                  ) : (
                    <div className="space-y-3 max-w-sm">
                      <input
                        type="password"
                        value={senha1}
                        onChange={e => setSenha1(e.target.value)}
                        placeholder="Nova senha (mín. 8 caracteres)"
                        className={inputClass}
                      />
                      <input
                        type="password"
                        value={senha2}
                        onChange={e => setSenha2(e.target.value)}
                        placeholder="Confirmar nova senha"
                        className={inputClass}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={salvarSenha}
                          disabled={salvandoSenha}
                          className="text-sm font-medium bg-zinc-900 dark:bg-white
                                     text-white dark:text-zinc-900 px-4 py-2
                                     rounded-lg hover:opacity-90
                                     disabled:opacity-50 transition-opacity"
                        >
                          {salvandoSenha ? 'Salvando…' : 'Salvar senha'}
                        </button>
                        <button
                          onClick={() => {
                            setShowSenha(false);
                            setSenha1('');
                            setSenha2('');
                            setMsgSenha(null);
                          }}
                          disabled={salvandoSenha}
                          className="text-sm text-zinc-400 hover:text-zinc-600
                                     dark:hover:text-zinc-300 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  {msgSenha && (
                    <p className={`text-xs mt-2 ${
                      msgSenha.ok
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {msgSenha.texto}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-zinc-500
                                dark:text-zinc-400">
                  <GoogleIcon />
                  Login via Google
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── SEÇÃO 2 — CRÉDITOS & ASSINATURA ─────────────────────────── */}
        <SectionCard
          title="Créditos & Assinatura"
          action={
            <Link href="/planos"
              className="flex items-center gap-1 text-xs font-medium
                         text-zinc-500 hover:text-zinc-700
                         dark:hover:text-zinc-300 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Link>
          }
        >
          {loadingResumo ? (
            <SkeletonRows rows={3} />
          ) : erroResumo ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                Não foi possível carregar seus créditos.
              </p>
              <button
                onClick={() => carregarResumo()}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300
                           hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Assinatura mensal */}
              {assinaturaAtiva && statusInfo && (
                <div className="mx-5 mt-4 rounded-lg border border-zinc-200
                                dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/60
                                px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          Plano {PLANO_NOME[assinatura!.plano] ?? assinatura!.plano}
                        </p>
                        <span className="text-xs text-zinc-400">
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {PLANO_PRECO[assinatura!.plano] ?? ''}/mês
                        {' · '}
                        {creditosDoCiclo} entrevista{creditosDoCiclo !== 1 ? 's' : ''} restante{creditosDoCiclo !== 1 ? 's' : ''} neste ciclo
                        {assinatura!.current_period_end &&
                          ` · renova em ${formatDate(assinatura!.current_period_end)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setModalCancelar(true)}
                      className="shrink-0 text-xs font-medium text-zinc-400
                                 border border-zinc-200 dark:border-zinc-700
                                 rounded-lg px-3 py-1.5 hover:text-red-500
                                 hover:border-red-200 dark:hover:border-red-900/50
                                 transition-colors"
                    >
                      Cancelar assinatura
                    </button>
                  </div>
                </div>
              )}

              {/* Créditos avulsos */}
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
                <>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {disponivel.map(c => (
                      <div key={c.id}
                           className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            1 entrevista · {c.perguntas} perguntas
                          </p>
                          {c.expires_at && (
                            <p className="text-xs text-amber-500 mt-0.5">
                              expira em {formatDateShort(c.expires_at)}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5
                                         rounded-full bg-emerald-100
                                         dark:bg-emerald-900/30 text-emerald-700
                                         dark:text-emerald-400">
                          DISPONÍVEL
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 pb-4 pt-1">
                    <Link href="/setup"
                      className="flex items-center justify-between w-full
                                 bg-zinc-900 dark:bg-white text-white
                                 dark:text-zinc-900 px-4 py-3 rounded-lg
                                 hover:bg-zinc-700 dark:hover:bg-zinc-100
                                 transition-colors group">
                      <span className="text-sm font-semibold">Fazer entrevista</span>
                      <ChevronRight className="w-4 h-4 opacity-60
                                               group-hover:opacity-100
                                               transition-opacity" />
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* ── SEÇÃO 3 — PAGAMENTOS ─────────────────────────────────────── */}
        <SectionCard title="Pagamentos">
          {loadingResumo ? (
            <SkeletonRows rows={3} />
          ) : erroResumo ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-zinc-400">
                Não foi possível carregar seus pagamentos.
              </p>
            </div>
          ) : pagamentos.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-zinc-400">
                Nenhum pagamento realizado ainda.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pagamentos.map(p => {
                const badge = badgePagamento(p.status);
                return (
                  <div key={p.id}
                       className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900
                                    dark:text-white truncate">
                        {PLANO_LABEL[p.plano] ?? p.plano}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {PLANO_PRECO[p.plano] ?? '—'}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5
                                        rounded-full ${badge.cls}`}>
                        {badge.label.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

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
          <a href="mailto:suporte.entrevistador.ia@gmail.com"
             className="hover:text-zinc-600 transition-colors">
            Suporte
          </a>
        </div>
      </div>

      {/* Modal de cancelamento (duas etapas: abrir → confirmar) */}
      {modalCancelar && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center
                     justify-center p-4"
          onClick={() => !cancelando && setModalCancelar(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl border
                       border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
              Cancelar assinatura?
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              Você mantém os créditos já recebidos; apenas não haverá novas
              cobranças.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setModalCancelar(false)}
                disabled={cancelando}
                className="w-full text-sm font-semibold bg-zinc-900 dark:bg-white
                           text-white dark:text-zinc-900 px-4 py-2.5 rounded-lg
                           hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Manter assinatura
              </button>
              <button
                onClick={cancelarAssinatura}
                disabled={cancelando}
                className="w-full text-sm font-medium text-red-600 border
                           border-zinc-200 dark:border-zinc-700 px-4 py-2.5
                           rounded-lg hover:border-red-200
                           dark:hover:border-red-900/50 disabled:opacity-50
                           transition-colors"
              >
                {cancelando ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
