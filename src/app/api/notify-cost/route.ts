import { NextRequest, NextResponse } from 'next/server';
import { parseRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(parseRateLimit, ip)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const data = await req.json();

    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return NextResponse.json({ ok: true });
    }

    const idiomaLabel = data.idioma === 'en' ? '🇺🇸 EN' : '🇧🇷 PT';
    const avatarLabel: Record<string, string> = {
      sarah: 'Sarah 👩', carlos: 'Carlos 👨', alex: 'Alex 🧑',
    };

    const msg =
      `📊 *Sessão concluída*\n` +
      `\n` +
      `👤 *${data.candidato || 'Candidato'}*\n` +
      `💼 ${data.jobTitulo || 'Não informado'}\n` +
      `🏢 ${data.jobEmpresa || 'Empresa não informada'}\n` +
      `\n` +
      `🎯 *Score:* ${data.scoreGeral ?? 0}/100\n` +
      `❓ *Perguntas respondidas:* ${data.perguntas ?? 0}\n` +
      `🗣️ *Entrevistador:* ${avatarLabel[data.avatar] ?? data.avatar ?? 'Sarah'} ${idiomaLabel}\n` +
      `\n` +
      `💰 *Custo da sessão:*\n` +
      `  • IA: $${Number(data.custoIA ?? 0).toFixed(5)}\n` +
      `  • TTS (OpenAI): $${Number(data.custoTTS ?? 0).toFixed(5)}\n` +
      `  • *Total: $${Number(data.custoTotal ?? 0).toFixed(5)} USD*\n` +
      `\n` +
      `📈 *Tokens:*\n` +
      `  • Entrada: ${Number(data.tokensIn ?? 0).toLocaleString('pt-BR')}\n` +
      `  • Saída: ${Number(data.tokensOut ?? 0).toLocaleString('pt-BR')}\n` +
      `  • Voz: ${Number(data.ttsChars ?? 0).toLocaleString('pt-BR')} chars`;

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    chatId,
          text:       msg,
          parse_mode: 'Markdown',
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.description ?? 'Erro Telegram' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
