import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json(
        { error: 'Telegram não configurado.' },
        { status: 503 }
      );
    }

    const msg =
      `💼 *${data.jobTitulo || 'Vaga não informada'}*\n` +
      `👤 ${data.candidato || 'Candidato'}\n` +
      `💰 $${Number(data.custoTotal || 0).toFixed(5)} USD`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text:       msg,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result?.description ?? 'Erro Telegram' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch {
    return NextResponse.json(
      { error: 'Erro interno.' },
      { status: 500 }
    );
  }
}
