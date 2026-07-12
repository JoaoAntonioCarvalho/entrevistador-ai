// Envio direto ao Telegram Bot API para uso em API routes (server-side).
// NÃO usar telegram.ts (client-only, faz `fetch` de URL relativa e tem guard
// `typeof window === 'undefined'` — silenciosamente não faz nada no server) nem
// o relay público /api/notify/telegram (rate-limited por IP anônimo junto de
// tráfego de spam — não deve competir com esse balde). Mesmo padrão de fetch já
// usado em /api/notify/telegram e /api/notify-cost.
export async function sendTelegramNotification(mensagem: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    chatId,
      text:       mensagem,
      parse_mode: 'Markdown',
    }),
  });
}
