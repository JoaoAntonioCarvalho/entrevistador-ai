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
├── e7b5632  feat: projeto inicial — Entrevistador.ai
├── be9c51e  feat: rate limiting nas rotas de IA
├── c7a5bad  feat: páginas legais (termos, privacidade, cookies)
├── a4424f6  feat: auth conectado ao fluxo + cadeado nas opções de perguntas
├── fca42ec  feat: página de planos e preços
├── d9eefa0  feat: integração Mercado Pago + sistema de créditos
├── 62a4242  feat: preservar dados do setup ao navegar + OCR PDF via Claude Vision
├── 5dc2992  feat: consumir crédito ao encerrar entrevista paga
├── 2c51079  feat: login com Google OAuth
├── 7a2327f  feat: seção de preços na landing page
├── 042ce5c  feat: proteção de rota /historico (requireAuth)
├── bf938e2  feat: pagamento/sucesso com polling + pagamento/pendente
├── b0f8d0a  feat: modal de gate de pagamento + retomar entrevista após pagar
├── ca92316  feat: SEO básico (metadata, sitemap, robots, og:image)
├── 3cfa7af  feat: email de suporte no footer e páginas legais
└── c8047c4  feat: Sentry para monitoramento de erros em produção  ← último commit
```

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
