'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AvatarProfile, InterviewConfig as IConfig, Job } from '@/lib/types';
import { resolveAvatarProfile } from '@/lib/types';
import { AVATAR_PROFILES, DEFAULT_CONFIG } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useHasHistory } from '@/hooks/useHasHistory';

const OPCOES_PERGUNTAS = [7, 14] as const;

interface Props {
  onComplete:      (config: IConfig) => void;
  job:             Job;
  profiles?:       AvatarProfile[];
  loadingProfiles?: boolean;
}

type SelectCardProps = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
};

function SelectCard({ selected, onClick, children, className = '' }: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left text-sm
                  transition-colors focus:outline-none
                  focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 ${
        selected
          ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900'
          : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
      } ${className}`}
    >
      {children}
    </button>
  );
}

const AVATAR_COLORS: Record<string, string> = {
  sarah: 'bg-purple-500',
  carlos: 'bg-blue-500',
  alex: 'bg-amber-500',
};

export default function InterviewConfig({ onComplete, job, profiles, loadingProfiles }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { maxPerguntas, totalCreditos, isMensal, mensalEsgotado, hasAnyCredit, loading: loadingCredits } = useCredits();
  const { hasHistory } = useHasHistory();
  const [config, setConfig] = useState<IConfig>({ ...DEFAULT_CONFIG });

  function opcaoBloqueada(qtd: number): boolean {
    if (qtd === 7) return false;
    if (!user) return true;
    if (loadingCredits) return true;
    return maxPerguntas < qtd;
  }

  const resolvedProfiles = useMemo(() => {
    const source = profiles ?? AVATAR_PROFILES;
    return source.map(p => resolveAvatarProfile(p, config.idioma));
  }, [profiles, config.idioma]);

  useEffect(() => {
    const recommended: IConfig['tipo'] =
      (job.stack_tecnica ?? []).length === 0 ? 'comportamental' : 'mista';
    setConfig((prev) => ({ ...prev, tipo: recommended }));
  }, [job]);

  function update<K extends keyof IConfig>(key: K, value: IConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Idioma */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Idioma</h3>
        <div className="grid grid-cols-2 gap-3">
          <SelectCard selected={config.idioma === 'pt'}
                      onClick={() => update('idioma', 'pt')}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-green-600 text-white px-1.5 py-0.5 rounded">PT</span>
              <span>Português</span>
            </div>
          </SelectCard>
          <SelectCard selected={config.idioma === 'en'}
                      onClick={() => update('idioma', 'en')}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">EN</span>
              <span>English</span>
            </div>
          </SelectCard>
        </div>
      </section>

      {/* Tipo */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Tipo de entrevista
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['comportamental', 'tecnica', 'mista'] as const).map((tipo) => (
            <SelectCard key={tipo} selected={config.tipo === tipo}
                        onClick={() => update('tipo', tipo)}>
              <span className="capitalize">
                {tipo === 'tecnica'
                  ? 'Técnica'
                  : tipo === 'comportamental'
                  ? 'Comportamental'
                  : 'Mista'}
              </span>
            </SelectCard>
          ))}
        </div>
      </section>

      {/* Quantidade de perguntas */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Quantidade de perguntas
        </h3>
        {user && !loadingCredits && (hasAnyCredit || mensalEsgotado) && (
          <p className={`text-xs -mt-1 ${
            mensalEsgotado
              ? 'text-amber-600 dark:text-amber-500'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}>
            {mensalEsgotado
              ? 'Você já usou todas as entrevistas do seu plano mensal neste ciclo. Adquira mais para continuar praticando.'
              : isMensal
              ? `Plano mensal ativo · ${totalCreditos} ${totalCreditos === 1 ? 'entrevista disponível' : 'entrevistas disponíveis'} (até ${maxPerguntas} perguntas)`
              : `${totalCreditos} ${totalCreditos === 1 ? 'crédito disponível' : 'créditos disponíveis'} · até ${maxPerguntas} perguntas por entrevista`}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {OPCOES_PERGUNTAS.map(n => {
            const bloqueado = opcaoBloqueada(n);
            const carregando = n !== 7 && !!user && loadingCredits;
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  if (bloqueado) {
                    router.push('/planos?return=setup');
                    return;
                  }
                  update('perguntas', n);
                }}
                className={`relative flex flex-col items-center justify-center
                            rounded-xl border py-3 px-4 transition-all
                            ${config.perguntas === n && !bloqueado
                              ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                              : 'border-zinc-200 dark:border-zinc-700'
                            }
                            ${bloqueado
                              ? 'opacity-60 cursor-pointer'
                              : 'hover:border-zinc-400 dark:hover:border-zinc-500'
                            }
                            ${carregando ? 'animate-pulse' : ''}`}
              >
                {bloqueado && !carregando && (
                  <div className="absolute top-1.5 right-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2"
                         strokeLinecap="round" strokeLinejoin="round"
                         className="text-zinc-400">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                )}
                <span className={`text-lg font-bold tabular-nums
                                  ${bloqueado
                                    ? 'text-zinc-400 dark:text-zinc-600'
                                    : 'text-zinc-900 dark:text-white'}`}>
                  {n}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {carregando
                    ? '...'
                    : bloqueado
                    ? (!user
                        ? 'Pago'
                        : mensalEsgotado
                        ? 'Plano esgotado'
                        : hasAnyCredit
                        ? 'Requer plano maior'
                        : 'Sem crédito')
                    : 'perguntas'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Nível */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Nível</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['junior', 'pleno', 'senior'] as const).map((n) => (
            <SelectCard key={n} selected={config.nivel === n}
                        onClick={() => update('nivel', n)}>
              {n === 'junior' ? 'Júnior' : n === 'pleno' ? 'Pleno' : 'Sênior'}
            </SelectCard>
          ))}
        </div>
      </section>

      {/* Entrevistador */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Entrevistador
        </h3>
        {loadingProfiles ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['sarah', 'carlos', 'alex'] as const).map((id) => (
              <div key={id}
                   className="rounded-lg border-2 border-zinc-100 dark:border-zinc-700/50
                               bg-zinc-50 dark:bg-zinc-800/50
                               p-4 flex sm:flex-col items-center sm:items-start
                               gap-3 animate-pulse">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0
                                  ${AVATAR_COLORS[id]} opacity-30`} />
                <div className="flex-1 sm:flex-none flex flex-col gap-2 w-full">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-700/50 rounded w-full" />
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-700/50 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {resolvedProfiles.map((avatar) => {
              const sel = config.avatar_id === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => update('avatar_id', avatar.id)}
                  className={`rounded-lg border-2 p-4 text-left
                              transition-colors focus:outline-none
                              focus:ring-2 focus:ring-zinc-900/10 ${
                    sel
                      ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex sm:flex-col items-center sm:items-start gap-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0
                                     ${AVATAR_COLORS[avatar.id]}
                                     flex items-center justify-center
                                     text-white font-bold text-lg`}>
                      {avatar.nome[0]}
                    </div>
                    <div className="flex-1 sm:flex-none">
                      <p className={`font-semibold text-sm ${
                        sel ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'
                      }`}>
                        {avatar.nome}
                      </p>
                      <p className={`text-xs mt-0.5 leading-snug ${
                        sel ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {avatar.titulo}
                      </p>
                      <p className={`text-xs mt-1 leading-relaxed hidden sm:block ${
                        sel ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400 dark:text-zinc-500'
                      }`}>
                        {avatar.descricao}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <button
        onClick={() => onComplete(config)}
        className="w-full bg-foreground text-background px-8 py-4 rounded-lg
                   font-medium text-base hover:opacity-90 transition-opacity mt-8"
      >
        Iniciar entrevista
      </button>
      {hasHistory && user && (
        <p className="text-xs text-zinc-400 text-center mt-2">
          Será debitado 1 crédito da sua conta
        </p>
      )}
    </div>
  );
}
