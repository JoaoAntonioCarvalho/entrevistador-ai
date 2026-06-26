import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultado: Record<string, any> = {};

  // 1. Checar variáveis de ambiente
  resultado.env = {
    MP_MODO:            process.env.MP_MODO ?? 'NÃO DEFINIDO',
    MP_MODO_ATIVO:      process.env.MP_MODO === 'producao' ? 'PRODUÇÃO' : 'TESTE',
    TEM_TOKEN_TEST:     !!process.env.MP_ACCESS_TOKEN_TEST,
    TEM_TOKEN_PROD:     !!process.env.MP_ACCESS_TOKEN_PROD,
    TEM_KEY_TEST:       !!process.env.MP_PUBLIC_KEY_TEST,
    TEM_KEY_TEST_VALOR: (process.env.MP_PUBLIC_KEY_TEST?.slice(0, 20) ?? 'AUSENTE') + '...',
    TEM_KEY_PROD:       !!process.env.MP_PUBLIC_KEY_PROD,
    TEM_WEBHOOK_SECRET: !!process.env.MP_WEBHOOK_SECRET,
    APP_URL:            process.env.NEXT_PUBLIC_APP_URL ?? 'NÃO DEFINIDO',
    TEM_SUPABASE_URL:   !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    TEM_SERVICE_ROLE:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  // 2. Checar conexão com Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count: totalSessions, error: e1 } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    const { count: totalCredits, error: e2 } = await supabase
      .from('credits')
      .select('*', { count: 'exact', head: true });

    const { count: totalPaySessions, error: e3 } = await supabase
      .from('payment_sessions')
      .select('*', { count: 'exact', head: true });

    const { data: ultimasSessoes } = await supabase
      .from('sessions')
      .select('id, status, payment_status, auth_user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: ultimosCreditos } = await supabase
      .from('credits')
      .select('id, auth_user_id, tipo, mp_status, usado, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: ultimasPaySessions } = await supabase
      .from('payment_sessions')
      .select('id, auth_user_id, plano, status, mp_payment_id, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    resultado.supabase = {
      conexao: 'OK',
      totalSessions,
      totalCredits,
      totalPaySessions,
      erros: {
        sessions:         e1?.message ?? null,
        credits:          e2?.message ?? null,
        payment_sessions: e3?.message ?? null,
      },
      ultimasSessoes,
      ultimosCreditos,
      ultimasPaySessions,
    };
  } catch (err: unknown) {
    resultado.supabase = {
      conexao: 'ERRO',
      erro:    err instanceof Error ? err.message : String(err),
    };
  }

  // 3. Checar SDK do Mercado Pago
  try {
    const { mp } = await import('@/lib/mp-config');
    resultado.mercadopago = { sdk: 'OK', tipo: typeof mp };
  } catch (err: unknown) {
    resultado.mercadopago = {
      sdk:  'ERRO',
      erro: err instanceof Error ? err.message : String(err),
    };
  }

  // 4. URL do webhook esperada
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://entrevistador-ai-demo.vercel.app'
  ).replace(/\/$/, '');

  resultado.webhook = {
    url_esperada: `${baseUrl}/api/mp-webhook`,
    instrucao: 'Configure exatamente esta URL no painel do MP → Webhooks',
  };

  return NextResponse.json(resultado, { status: 200 });
}
