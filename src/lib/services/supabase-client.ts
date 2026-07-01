import { createBrowserClient } from '@supabase/ssr';

type BrowserClient = ReturnType<typeof createBrowserClient>;

// Singleton: criar um novo client a cada chamada gera múltiplas instâncias de
// GoTrueClient (warning do Supabase) e listeners de auth duplicados. Memoizamos
// no módulo para que todo o app compartilhe a mesma instância no navegador.
let browserClient: BrowserClient | null = null;

export function createClient(): BrowserClient | null {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  browserClient = createBrowserClient(url, key);
  return browserClient;
}
