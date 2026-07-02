-- ============================================================================
-- Entrevistador.IA — Políticas de Row Level Security (RLS)
-- Rode no SQL Editor do Supabase. O script é idempotente (pode rodar de novo).
-- ============================================================================
--
-- CONTEXTO CRÍTICO — leia antes de aplicar:
--
--   Todas as rotas de API do app usam a SERVICE-ROLE KEY, que tem BYPASSRLS.
--   Ou seja: elas IGNORAM estas políticas por completo. Habilitar RLS NÃO
--   quebra nenhuma rota do servidor (credits, pagamento, session/save,
--   session/history, conta/resumo, interview/turn, webhook do MP, etc.).
--
--   O que o RLS protege são os acessos feitos DIRETAMENTE do navegador com a
--   ANON KEY, e serve de defesa-em-profundidade caso a anon key vaze.
--
--   Hoje só existem DOIS acessos diretos do navegador à tabela `sessions`:
--     • getSessionById  -> página pública /resultado/[id] (link compartilhável)
--     • getHistoryByJob -> filtro por vaga em /historico
--   Tudo o mais já passa por rota de API (service_role).
--
--   MODELO DE ACESSO destas políticas:
--     service_role  -> acesso total (bypassa RLS) — é o servidor.
--     authenticated -> lê apenas as PRÓPRIAS linhas (auth.uid() = auth_user_id).
--     anon          -> sem acesso, EXCETO a leitura pública de `sessions`
--                      (ver seção 5, onde você ESCOLHE uma opção).
--     Nenhuma escrita por anon/authenticated: todo INSERT/UPDATE/DELETE continua
--     exclusivo do servidor (service_role).
--
--   NOTA SOBRE TIPOS: comparar como texto (auth.uid()::text = auth_user_id::text)
--   funciona independentemente de `auth_user_id` ser `text` ou `uuid`. Se a
--   coluna for `uuid`, você pode remover os ::text para usar o índice melhor.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0) REMOVER POLICIES LEGADAS da fase "grant all" (pré-autenticação)
--
--    Estas eram permissivas para {public} com cmd ALL. Como o RLS combina
--    policies por OR, elas ANULAM as restritivas abaixo — e por incluírem
--    INSERT permitiam, por exemplo, um usuário logado inserir o próprio crédito
--    (mp_status='approved') direto pela anon key = entrevistas grátis. O app não
--    depende delas (toda escrita passa por service_role). Removê-las é seguro.
-- ---------------------------------------------------------------------------
drop policy if exists "users_own_credits"          on public.credits;
drop policy if exists "users_own_payment_sessions" on public.payment_sessions;
drop policy if exists "anon_sessions_own_data"     on public.sessions;
drop policy if exists "auth_users_own_data"        on public.sessions;

-- ---------------------------------------------------------------------------
-- 1) SESSIONS
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own"   on public.sessions;
drop policy if exists "sessions_update_own"   on public.sessions;
drop policy if exists "sessions_delete_own"   on public.sessions;

-- Usuário logado lê as próprias sessões.
create policy "sessions_select_own"
  on public.sessions for select
  to authenticated
  using (auth.uid()::text = auth_user_id::text);

-- Usuário logado atualiza/apaga as próprias sessões. Defesa extra: hoje o app
-- só escreve via service_role, mas isto impede escrita cruzada caso algum dia
-- haja escrita direta pelo cliente.
create policy "sessions_update_own"
  on public.sessions for update
  to authenticated
  using      (auth.uid()::text = auth_user_id::text)
  with check (auth.uid()::text = auth_user_id::text);

create policy "sessions_delete_own"
  on public.sessions for delete
  to authenticated
  using (auth.uid()::text = auth_user_id::text);


-- ---------------------------------------------------------------------------
-- 2) CREDITS  (dado financeiro — trancado)
-- ---------------------------------------------------------------------------
alter table public.credits enable row level security;

drop policy if exists "credits_select_own" on public.credits;

create policy "credits_select_own"
  on public.credits for select
  to authenticated
  using (auth.uid()::text = auth_user_id::text);
-- Sem policy de INSERT/UPDATE/DELETE => só service_role escreve (webhook, consume).


-- ---------------------------------------------------------------------------
-- 3) PAYMENT_SESSIONS  (dado financeiro — trancado)
-- ---------------------------------------------------------------------------
alter table public.payment_sessions enable row level security;

drop policy if exists "payment_sessions_select_own" on public.payment_sessions;

create policy "payment_sessions_select_own"
  on public.payment_sessions for select
  to authenticated
  using (auth.uid()::text = auth_user_id::text);
-- Sem policy de escrita => só service_role (mp-criar-preferencia, webhook).


-- ---------------------------------------------------------------------------
-- 4) AUDIT_LOG  (interno — nenhum acesso por anon/authenticated)
--
--    A tabela não existia (os inserts do webhook do MP falhavam em silêncio via
--    .catch). Criamos aqui com as colunas exatas que o webhook grava, e ligamos
--    o RLS sem policies => só service_role acessa.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  evento        text not null,
  auth_user_id  text,
  plano         text,
  mp_payment_id text,
  ip            text,
  created_at    timestamptz not null default now()
);

alter table public.audit_log enable row level security;
-- Nenhuma policy => apenas service_role (bypassa RLS) lê e escreve.


-- ---------------------------------------------------------------------------
-- 5) LEITURA PÚBLICA DE SESSIONS — OPÇÃO A (implementada no código)
--
--    Os dois acessos diretos que a anon key fazia a `sessions` foram migrados
--    para rotas service-role que devolvem SÓ colunas seguras:
--      • getSessionById  -> POST /api/session/result       (scores/feedback,
--                           sem transcript, sem resposta_ideal, sem auth_user_id)
--      • getHistoryByJob -> POST /api/session/history-by-job (só resumo)
--
--    Portanto NÃO criamos policy de leitura para `anon`. A anon key não tem
--    mais nenhum acesso direto a `sessions` — deny-by-default do RLS resolve.
--    (Nada a rodar aqui; esta seção é só documentação.)
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 6) (OPCIONAL) Endurecer os GRANTs — reduzir a superfície além do RLS.
--    O RLS já bloqueia escrita por anon/authenticated; isto é reforço.
--    Descomente se quiser remover privilégios de escrita da anon key:
-- ---------------------------------------------------------------------------
-- revoke insert, update, delete on public.sessions,         public.credits,
--        public.payment_sessions, public.audit_log from anon;


-- ---------------------------------------------------------------------------
-- 7) VERIFICAÇÃO — rode depois para conferir
-- ---------------------------------------------------------------------------
-- RLS habilitado em todas as tabelas? (rowsecurity deve ser true)
--   select relname, relrowsecurity
--   from pg_class
--   where relname in ('sessions','credits','payment_sessions','audit_log');
--
-- Policies criadas?
--   select tablename, policyname, cmd, roles
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;
-- ============================================================================
