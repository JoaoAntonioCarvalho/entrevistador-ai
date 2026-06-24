# Resumo da Sessão — Entrevistador.ai

> Leia este arquivo no início de cada nova sessão para entender o estado atual do projeto.

## O que é o projeto

**Entrevistador.ai** — simulador de entrevistas de emprego por voz com IA.
- Domínio: `entrevistador-ai.com.br`
- Repositório: https://github.com/JoaoAntonioCarvalho/entrevistador-ai-production.git
- Deploy: Vercel (automático a cada push em `main`)
- Para rodar local: `cd mockai && npm run dev` → http://localhost:3000

## Estado atual do repositório

```
main
├── ...     (commits anteriores)
├── c8047c4  feat: Sentry para monitoramento de erros em produção
├── e14afd0  fix: esconder opcao finalizar-atual sem entrevista ativa
├── aae9673  fix: botao login na landing + otimizacao de performance
├── 02c6af8  fix: redirect apos login + mensagem de confirmacao de email
├── 5e2cb5e  fix: adicionar supabase-client.ts e sentry hook ao repositorio
├── 5ca8a54  fix: mover createClient para dentro do handler em credits/consume
└── 54b408f  fix: force-dynamic em todas as paginas + supabase client seguro  ← último commit
```

## O que foi feito na sessão de 24/06/2026

### 1. Sentry — hook de navegação (`5e2cb5e`)

- `instrumentation-client.ts`: adicionado `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart` (eliminava warning ACTION REQUIRED no `npm run dev`)

### 2. Planos — esconder "Finalizar atual" sem entrevista ativa (`e14afd0`)

- `planos/page.tsx`: `temEntrevistaAtiva` verifica `candidate.nome` + `status === 'active'` + `conversation.length > 0`
- Card "Finalizar atual" envolvido em `{temEntrevistaAtiva && (...)}` — some quando não há sessão em andamento
- Grid ajusta de `md:grid-cols-3` para `md:grid-cols-2 max-w-2xl` quando só há 2 cards
- `handleComprar('finalizar-atual')` redireciona para `/setup` se acessado por URL direta sem entrevista

### 3. Botão de login na landing page (`aae9673`)

- `page.tsx`: importa `useAuth`, substitui o link `temHistorico` (localStorage) pelo botão Entrar/Meu histórico baseado em auth real
- Remove `useState(temHistorico)` e `localStorage.getItem` do `useEffect` (só `setMounted(true)` fica)

### 4. Redirect após login + mensagem de confirmação de email (`02c6af8`)

- `AuthForm.tsx`: signup e login separados — signup mostra toast de confirmação e **não** chama `onSuccess`; login chama `onSuccess` só após sucesso com mensagens específicas (`Invalid login`, `Email not confirmed`)
- `entrar/page.tsx`: `useEffect` com `onAuthStateChange` redireciona ao `SIGNED_IN` — cobre retorno do link de email

### 5. Arquivos não commitados no GitHub (`5e2cb5e`)

- `src/lib/services/supabase-client.ts` estava `untracked` — causava falha no Vercel
- `src/components/layout/Header.tsx` com botões Entrar/Sair baseados em auth adicionado ao commit

### 6. `createClient` fora do handler em credits/consume (`5ca8a54`)

- `api/credits/consume/route.ts`: `createClient(...)` era chamado no nível do módulo (build time, sem env vars); movido para dentro do `POST`

### 7. Fix crítico de build: `@supabase/ssr` sem env vars (`54b408f`)

Causa raiz: `createBrowserClient` lança erro se `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` são `undefined` durante o prerender do Next.js.

**`src/lib/services/supabase-client.ts`** — retorna `BrowserClient | null` (via `ReturnType<typeof createBrowserClient>`) quando vars ausentes; sem `any`, sem eslint-disable

**`src/hooks/useAuth.ts`** — `createClient()` movido para dentro do `useEffect` e de cada função de auth; null guards em todos os pontos; tipos `Session` e `AuthChangeEvent` explicitados

**`src/lib/services/supabase.ts`** — dois null guards em `createAuthClient()`; `SessionSummary` como tipo no `.map()`

**`src/app/entrar/page.tsx`** — null guard antes de `onAuthStateChange`; tipos `AuthChangeEvent` / `Session | null` no callback

**Todas as 15 páginas** — `export const dynamic = 'force-dynamic'` adicionado após imports:
`/`, `/setup`, `/interview`, `/dashboard`, `/feedback`, `/historico`, `/planos`, `/entrar`, `/termos`, `/privacidade`, `/pagamento/sucesso`, `/pagamento/falhou`, `/pagamento/pendente`, `/camera-check`, `/resultado/[id]`

---

## O que foi feito na sessão de 23/06/2026

### 1. Preservar dados do setup ao navegar + OCR de PDF (`62a4242`)

- `ResumeUpload.tsx` agora mostra card com currículo já carregado quando o usuário volta ao step 1
  - Botões: "Usar este currículo →" (continua com o existente) e "Fazer upload de outro" (limpa e reabre uploader)
  - Props novas: `initialManualData` e `onManualDataChange` para persistir formulário manual entre navegações
- `setup/page.tsx`: novo state `savedManualData` passado ao `ResumeUpload`
- `src/lib/pdf-to-images.ts` (criado): converte PDF em imagens Base64 via `pdfjs-dist/legacy/build/pdf.mjs` + `canvas` para Node.js
- `parse-resume/route.ts`: detecta PDF com menos de 150 chars de texto extraído → fallback OCR via Claude Vision
  - Anthropic: image content blocks; OpenRouter: `image_url` format com `anthropic/claude-haiku-4.5`

### 2. Consumir crédito ao encerrar entrevista (`5dc2992`)

- `src/app/api/credits/consume/route.ts` (criado): marca `usado=true` na tabela `credits` usando service role
- `interview/page.tsx`: `creditConsumedRef` + `useEffect` que dispara fire-and-forget ao `interviewState === 'ended'`
  - Cobre tanto encerramento automático (todas as perguntas) quanto manual (botão Encerrar)

### 3. Login com Google OAuth (`2c51079`)

- `useAuth.ts`: novo método `signInWithGoogle()` via `supabase.auth.signInWithOAuth`
- `src/app/auth/callback/route.ts` (criado): troca code por sessão, redireciona para `?return=` URL
- `AuthForm.tsx`: botão Google com logo SVG 4 cores + separador "ou" acima do form email/senha

### 4. Seção de preços na landing page (`7a2327f`)

- 3 cards inseridos entre "Diferenciais" e footer: Grátis (R$0), Avulso (R$9,90 — "Mais popular"), Mensal (R$39,90)
- Linha de garantia: "🔒 Pagamento via Mercado Pago · Pix disponível · Garantia de 7 dias conforme CDC art. 49"

### 5. Proteção de rota /historico (`042ce5c`)

- `useRouteGuard.ts`: nova flag `requireAuth?: boolean`
  - Espera `loading === false` antes de agir (evita redirect false-positive enquanto Supabase hidrata sessão)
  - Redireciona para `/entrar?return=<pathname>` se não logado
- `historico/page.tsx`: `useRouteGuard({ requireAuth: true })` como primeira linha

### 6. Pagamento/sucesso com polling + pagamento/pendente (`bf938e2`)

- `pagamento/sucesso/page.tsx` (substituído): detecta `plano=finalizar-atual`
  - Poll em `/api/credits/check` a cada 2s, máx 10 tentativas (20s)
  - 3 estados visuais: `aguardando` (spinner) → `confirmado` (check verde) → `timeout` (alerta âmbar)
  - Todos redirecionam para `/interview?resume=true&sessionId=<id>`
  - Outros planos: vai para `/setup` após 2,5s
- `pagamento/pendente/page.tsx` (criado): para Pix/boleto pendentes
  - Botão "Verificar e continuar entrevista" + link para `/historico`

### 7. Modal de gate de pagamento + retomada após pagar (`b0f8d0a`)

- `PaymentGateModal.tsx` (criado): sobrepõe a entrevista (z-50, backdrop-blur) ao receber 402
  - Opções: "Finalizar esta entrevista — R$9,90" (chama `/api/mp-criar-preferencia`) ou "Ver todos os planos"
  - Não logado: salva `pending-interview-session` no localStorage e redireciona para `/entrar` com return URL
- `interview/page.tsx`:
  - 402 agora abre `PaymentGateModal` em vez de navegar para `/planos`
  - Sets `interviewState='waiting'` e libera `isProcessingTurnRef` para retomada
  - `useEffect` de mount lê `window.location.search` para detectar `?resume=true` e limpa a URL
  - `useSearchParams` evitado (exigiria Suspense em Next.js 14); usa `URLSearchParams(window.location.search)` no `useEffect`
  - O `useEffect` do primeiro turno verifica `conversation.length === 0` → não reinicia entrevista ao retomar

### 8. SEO básico (`ca92316`)

- `layout.tsx`: `metadataBase`, `title.default` + `template '%s | Entrevistador.ai'`, keywords[], openGraph completo, twitter card, robots googleBot
- `layout.tsx` por rota (padrão Next.js 14 para páginas `'use client'`):
  - `planos/layout.tsx` → "Planos e Preços"
  - `entrar/layout.tsx` → "Entrar ou criar conta" + noindex
  - `dashboard/layout.tsx` → "Resultado da entrevista" + noindex
  - `interview/layout.tsx` → "Entrevista em andamento" + noindex
- `src/app/sitemap.ts`: expõe `/`, `/planos`, `/termos`, `/privacidade`
- `src/app/robots.ts`: disallow `/interview`, `/dashboard`, `/feedback`, `/camera-check`, `/pagamento/`, `/api/`
- `public/og-image.png`: placeholder 1200×630 gerado via `canvas` (fundo #09090b, texto branco/cinza)
- **Nota**: `metadata.ts` não é arquivo especial do Next.js — apenas `page.tsx`/`layout.tsx` exportam metadata

### 9. Email de suporte (`3cfa7af`)

- Landing footer: ícone envelope + `suporte@entrevistador-ai.com.br` ao lado dos links legais
- `termos/page.tsx` § 8: link `mailto:` direto
- `privacidade/page.tsx` § 7: link `mailto:` + "Respondemos em até 2 dias úteis"
- `planos/page.tsx`: email abaixo da linha de garantia CDC

### 10. Sentry para monitoramento de erros (`c8047c4`)

Pacote instalado: `@sentry/nextjs@10.60.0`

**Arquivos criados:**
- `instrumentation-client.ts` — init client-side (nome correto para `@sentry/nextjs` v10; `sentry.client.config.ts` está deprecado)
- `sentry.server.config.ts` — init server-side; `beforeSend` injeta `api_route` nas tags
- `sentry.edge.config.ts` — init edge runtime
- `src/instrumentation.ts` — `register()` importa server/edge configs (obrigatório no v10)
- `src/app/global-error.tsx` — captura erros não tratados no nível do layout

**Arquivos modificados:**
- `next.config.js`: `withSentryConfig` wrapping (CommonJS `require`); `sourcemaps.disable=true` (sem `SENTRY_AUTH_TOKEN` configurado, evita consumo de disco)
- `api/interview/turn/route.ts`: `Sentry.captureException` no catch com contexto `sessionId` + `perguntasRespondidas`; mantém fallback existente
- `api/mp-webhook/route.ts`: `Sentry.captureException` no catch; mantém retorno 200 pro MP
- `api/tts/route.ts`: `Sentry.captureException` no catch com tags `route='tts'` + `provider='elevenlabs'`

**Filtros ativos:**
- Ignora: `ResizeObserver loop limit exceeded`, `Failed to fetch`, `AbortError`, etc.
- `beforeSend` no client filtra erros de extensões do browser (`chrome-extension`, `moz-extension`)
- Habilitado apenas em `NODE_ENV === 'production'`; sampling de 10% nas transações

**Variável a adicionar no Vercel:**
```
NEXT_PUBLIC_SENTRY_DSN=https://5bfce171af2d7b5c97ff5d76740464af@o4511615913885696.ingest.us.sentry.io/4511615938789376
```

## ⚠️ Ações manuais pendentes

### SQL no Supabase (se ainda não executado)

```sql
create table if not exists credits (
  id             uuid primary key default gen_random_uuid(),
  auth_user_id   uuid references auth.users(id) not null,
  tipo           text not null,
  perguntas      int  not null,
  usado          boolean default false,
  session_id     uuid references sessions(id),
  mp_payment_id  text,
  mp_status      text default 'pending',
  created_at     timestamptz default now(),
  expires_at     timestamptz
);
alter table credits enable row level security;
create policy "users_own_credits" on credits for all
  using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);
grant all on credits to service_role;
grant select on credits to authenticated;

create table if not exists payment_sessions (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references sessions(id),
  auth_user_id     uuid references auth.users(id),
  plano            text not null,
  mp_preference_id text,
  mp_payment_id    text,
  status           text default 'pending',
  created_at       timestamptz default now()
);
alter table payment_sessions enable row level security;
create policy "users_own_payment_sessions" on payment_sessions for all
  using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);
grant all on payment_sessions to service_role;

alter table sessions add column if not exists payment_status text default 'unpaid';
```

### Variáveis de ambiente no Vercel

```
MP_ACCESS_TOKEN_PROD=APP_USR-xxxx
MP_PUBLIC_KEY_PROD=APP_USR-xxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://entrevistador-ai.com.br
NEXT_PUBLIC_SENTRY_DSN=https://5bfce171af2d7b5c97ff5d76740464af@o4511615913885696.ingest.us.sentry.io/4511615938789376
```

### Google OAuth no Supabase Dashboard

- Authentication → Providers → Google → habilitar
- Adicionar Client ID e Client Secret do Google Cloud Console
- Redirect URL: `https://entrevistador-ai.com.br/auth/callback`

### Webhook no painel do Mercado Pago

URL: `https://entrevistador-ai.com.br/api/mp-webhook`
Evento: `payment`

### OG image

`public/og-image.png` é um placeholder gerado por script. Para produção, substituir por imagem profissional 1200×630px com logo e screenshot do produto.

### Email de suporte

Substituir `suporte@entrevistador-ai.com.br` pelo email real nas 4 ocorrências:
- `src/app/page.tsx` (footer da landing)
- `src/app/termos/page.tsx` (§ 8)
- `src/app/privacidade/page.tsx` (§ 7)
- `src/app/planos/page.tsx` (rodapé)

## Próximos passos (roadmap)

1. **Limite de sessões grátis por usuário** — controlar quantas sessões anônimas um IP/device já fez
2. **Email transacional** — confirmação de compra, recibo de pagamento
3. **Source maps no Sentry** — configurar `SENTRY_AUTH_TOKEN` no Vercel e remover `sourcemaps.disable=true` do `next.config.js`
4. **Autenticação completa** — substituir `user_id` anônimo por `auth.uid()` do Supabase + RLS real
5. **OG image profissional** — substituir placeholder por imagem com screenshot real do produto

## Como retomar

```
cd mockai
git pull
npm run dev
```

Leia o `CLAUDE.md` na raiz para as regras críticas que nunca devem ser violadas.
