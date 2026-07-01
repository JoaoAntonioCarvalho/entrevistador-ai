import { NextRequest, NextResponse } from 'next/server';
import { notifyRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Endpoint público que retransmite para o Telegram interno — rate limit
  // evita que alguém use como relay de spam contra o chat da equipe.
  const ip = getClientIp(req);
  if (!await checkRateLimit(notifyRateLimit, ip)) {
    return NextResponse.json({ ok: true }, { status: 429 });
  }

  try {
    const { mensagem } = await req.json();

    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId || !mensagem) {
      return NextResponse.json({ ok: true });
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text:       mensagem,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
