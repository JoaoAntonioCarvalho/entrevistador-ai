'use client';

import { createClient } from '@/lib/services/supabase-client';

/**
 * Token de acesso (JWT) do usuário logado no Supabase, ou `null` se anônimo.
 * O servidor usa esse token para verificar a identidade — ver `auth-server.ts`.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * `fetch` que anexa automaticamente o token do Supabase no header
 * `Authorization` quando há usuário logado. O servidor deriva a identidade
 * DESSE token — nunca do corpo da requisição — então toda chamada a uma rota
 * autenticada (créditos, sessões, pagamento, turno de entrevista) deve usar
 * `authedFetch` no lugar de `fetch`. Chamadas anônimas continuam funcionando:
 * sem token, o servidor trata como usuário não autenticado.
 */
export async function authedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
