-- ============================================================================
-- Assinaturas recorrentes (MercadoPago PreApproval)
-- Rode isto UMA vez no SQL Editor do Supabase antes de subir o código de
-- assinatura para produção. Sem esta tabela, a compra de plano mensal falha.
-- ============================================================================

create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid not null,
  mp_preapproval_id   text unique not null,
  plano               text,                 -- mensal-starter | mensal-pro
  perguntas           int,                  -- 7 | 14
  status              text not null default 'pending', -- pending|authorized|paused|cancelled
  current_period_end  timestamptz,          -- próxima renovação
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists subscriptions_auth_user_id_idx
  on public.subscriptions (auth_user_id);

-- ── RLS: usuário lê só as próprias assinaturas; escrita só via service-role ──
-- (as rotas de API usam a service-role key, que ignora o RLS — o webhook e a
--  criação/cancelamento de assinatura escrevem por lá, nunca pelo cliente.)
alter table public.subscriptions enable row level security;

drop policy if exists "users_read_own_subscriptions" on public.subscriptions;
create policy "users_read_own_subscriptions"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid()::text = auth_user_id::text);
