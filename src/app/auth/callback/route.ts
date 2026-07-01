import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code      = searchParams.get('code');
  // Proteção contra open redirect: só aceitamos caminhos relativos internos.
  // Um `return` absoluto (https://evil.com) ou protocol-relative (//evil.com)
  // permitiria redirecionar o usuário para fora do site após o login.
  const rawReturn = searchParams.get('return') ?? '/historico';
  const returnUrl = rawReturn.startsWith('/') && !rawReturn.startsWith('//')
    ? rawReturn
    : '/historico';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name)                  { return cookieStore.get(name)?.value; },
          set(name, value, options)  { cookieStore.set({ name, value, ...options }); },
          remove(name, options)      { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(returnUrl, req.url));
}
