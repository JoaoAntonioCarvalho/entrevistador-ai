import { NextRequest, NextResponse } from 'next/server';
import { aiRateLimit, checkRateLimit, getClientIp } from '@/lib/services/rate-limit';

const VOICE_IDS: Record<string, { pt: string; en: string }> = {
  sarah: {
    pt: process.env.ELEVENLABS_VOICE_ID_SARAH    ?? '',
    en: process.env.ELEVENLABS_VOICE_ID_SARAH_EN ?? '',
  },
  carlos: {
    pt: process.env.ELEVENLABS_VOICE_ID_CARLOS    ?? '',
    en: process.env.ELEVENLABS_VOICE_ID_CARLOS_EN ?? '',
  },
  alex: {
    pt: process.env.ELEVENLABS_VOICE_ID_ALEX    ?? '',
    en: process.env.ELEVENLABS_VOICE_ID_ALEX_EN ?? '',
  },
};

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

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY não configurada.' }, { status: 503 });
    }

    // Mapear idioma para código ElevenLabs
    const languageCode = (lang as string)?.startsWith('pt') ? 'pt' : 'en';

    const avatarVoices = VOICE_IDS[avatarId as string] ?? VOICE_IDS.sarah;
    const voiceId = languageCode === 'en'
      ? (avatarVoices.en || avatarVoices.pt)
      : (avatarVoices.pt || avatarVoices.en);

    if (!voiceId) {
      return NextResponse.json(
        { error: 'Voice ID não encontrado.' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          language_code: languageCode,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[tts] ElevenLabs error:', err);
      return NextResponse.json(
        { error: 'TTS indisponível. Usando voz do navegador.' },
        { status: 503 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    const charCount = typeof text === 'string' ? text.length : 0;

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type':   'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'X-Chars-Used':   charCount.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'TTS indisponível. Usando voz do navegador.' },
      { status: 503 }
    );
  }
}
