import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import OpenAI from 'openai';
import { checkRateLimit, aiRateLimit, getClientIp } from '@/lib/services/rate-limit';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type OpenAIVoice = 'alloy' | 'ash' | 'coral' | 'echo' | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer';

const VOICE_MAP: Record<string, Record<string, OpenAIVoice>> = {
  sarah:  { 'pt-BR': 'nova',   'en-US': 'shimmer' },
  carlos: { 'pt-BR': 'onyx',   'en-US': 'echo'    },
  alex:   { 'pt-BR': 'fable',  'en-US': 'alloy'   },
};

const SPEED_MAP: Record<string, number> = {
  sarah:  0.88,
  carlos: 0.92,
  alex:   0.90,
};

function processarTextoParaTTS(texto: string, avatarId: string): string {
  let t = texto.trim();

  // Adicionar vírgula após conectivos sem pontuação para pausas de respiração
  t = t.replace(
    /\b(então|portanto|porém|contudo|entretanto|além disso|por outro lado|no entanto|dessa forma|sendo assim)\b(?!,)/gi,
    '$1,'
  );

  // Pausa após saudação inicial
  t = t.replace(
    /^(Olá|Oi|Bom dia|Boa tarde|Boa noite)([^,.])/i,
    '$1, $2'
  );

  // Reticências antes de perguntas reflexivas soam mais humanas
  t = t.replace(
    /\. (Me conta|Me fale|Pode me|Como você|O que você|Qual foi|Quando você|Por que você)/g,
    '... $1'
  );

  // Sarah: pausas pensativas após marcadores de escuta ativa
  if (avatarId === 'sarah') {
    t = t.replace(
      /\b(interessante|entendo|compreendo|certo)\b([^,.])/gi,
      '$1, $2'
    );
  }

  return t.replace(/  +/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(aiRateLimit, ip)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
      { status: 429 }
    );
  }

  try {
    const { text, avatarId, lang } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto vazio.' }, { status: 400 });
    }

    const languageCode     = (lang as string)?.startsWith('en') ? 'en-US' : 'pt-BR';
    const avatar           = ((avatarId as string) ?? 'sarah').toLowerCase();
    const voice            = VOICE_MAP[avatar]?.[languageCode] ?? VOICE_MAP.sarah[languageCode];
    const speed            = SPEED_MAP[avatar] ?? 0.90;
    const textoProcessado  = processarTextoParaTTS(text, avatar);

    const mp3Response = await openai.audio.speech.create({
      model:           'tts-1-hd',
      voice,
      input:           textoProcessado,
      response_format: 'mp3',
      speed,
    });

    const buffer    = Buffer.from(await mp3Response.arrayBuffer());
    const charCount = textoProcessado.length;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':   'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'X-Chars-Used':   charCount.toString(),
        'Cache-Control':  'no-store',
      },
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        route:    'tts',
        provider: 'openai',
      },
    });
    return NextResponse.json(
      { error: 'TTS indisponível. Usando voz do navegador.' },
      { status: 503 }
    );
  }
}
