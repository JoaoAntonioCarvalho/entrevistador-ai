import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * Verifica o token de acesso do Supabase enviado no header `Authorization:
 * Bearer <jwt>` e retorna o ID do usuário autenticado — ou `null` se não houver
 * token, se ele for inválido/expirado, ou se o usuário for anônimo.
 *
 * REGRA DE SEGURANÇA: nunca confie em um `authUserId` vindo do corpo da
 * requisição. Qualquer cliente pode enviar o UUID de outro usuário. Como as
 * rotas usam a service-role key (que ignora o RLS do Supabase), esta função é a
 * ÚNICA fonte confiável de identidade no servidor. Toda rota que autoriza acesso
 * a dados de um usuário DEVE derivar o `authUserId` daqui.
 *
 * `supabase.auth.getUser(token)` valida a assinatura e a expiração do JWT contra
 * o servidor de auth do Supabase — não é forjável no cliente.
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  return (await getAuthUser(req))?.id ?? null;
}

/**
 * Como `getAuthUserId`, mas retorna também o e-mail verificado do usuário —
 * necessário, por exemplo, para criar a assinatura no MercadoPago (payer_email).
 * O e-mail vem do token verificado, não do cliente, então não é forjável.
 *
 * `name`/`createdAt` também vêm do token verificado (`user_metadata` e
 * `created_at` do Supabase Auth). `name` só existe de fato para quem entrou
 * via Google (login por email/senha não coleta nome hoje) — pode vir `null`.
 */
export async function getAuthUser(
  req: NextRequest,
): Promise<{ id: string; email: string | null; name: string | null; createdAt: string | null } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    const metadata = data.user.user_metadata ?? {};
    const name = (metadata.full_name ?? metadata.name ?? null) as string | null;
    return {
      id:        data.user.id,
      email:     data.user.email ?? null,
      name,
      createdAt: data.user.created_at ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Divide um nome completo em first/last name para os payloads do Mercado
 * Pago. Retorna campos ausentes (não vazios) quando não houver o que dividir
 * — MP trata ausência de campo melhor do que string vazia.
 */
export function splitName(name: string | null): { firstName?: string; lastName?: string } {
  if (!name?.trim()) return {};
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
