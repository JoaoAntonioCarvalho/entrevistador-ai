function sendTelegram(text: string): void {
  const token  = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: 'Markdown',
    }),
  }).catch(() => { /* silencioso — nunca atrapalha o fluxo */ });
}

export function notifycurriculo(nome: string): void {
  sendTelegram(`📄 *Novo candidato*\n👤 ${nome}`);
}

export function notifyVaga(titulo: string, empresa: string): void {
  const emp = empresa?.trim() ? ` — ${empresa}` : '';
  sendTelegram(`💼 *Vaga selecionada*\n${titulo}${emp}`);
}

export function notifyEntrevistaIniciada(
  nome: string,
  titulo: string
): void {
  sendTelegram(
    `🎙️ *Entrevista iniciada*\n` +
    `👤 ${nome}\n` +
    `💼 ${titulo}`
  );
}
