'use client';

import { useRef, useState, type MutableRefObject } from 'react';
import { authedFetch } from '@/lib/services/api-client';

export type VoiceOutputState = 'idle' | 'speaking' | 'loading';

export interface UseVoiceOutputOptions {
  lang?:         string;
  voiceId?:      string;
  avatarId?:     string;
  sessionId?:    string;
  onError?:      () => void;
  onWordReveal?: (visibleText: string) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?:   () => void;
  onTTSChars?:   (chars: number) => void;
  audioContext?: AudioContext;
  // Preferir a ref: é lida no MOMENTO da execução do speak(), não na
  // renderização — `audioContext` (acima) é snapshot e fica obsoleto quando
  // o contexto nasce depois da render (toque de unlock no iOS)
  audioContextRef?: MutableRefObject<AudioContext | null>;
  // iOS apenas: troca do contexto quando a recuperação de congelamento
  // precisa recriá-lo
  onAudioContextRecreated?: (ctx: AudioContext) => void;
}

interface IOSPlayback {
  ended:     boolean;
  watchdog?: ReturnType<typeof setTimeout>;
}

// Bug conhecido do WebKit/iOS: o contexto reporta state 'running' mas está
// internamente congelado — currentTime para de avançar e nada é processado.
// O state sozinho não é confiável; o teste real é o relógio andar.
async function isContextFrozen(ctx: AudioContext): Promise<boolean> {
  if (ctx.state !== 'running') return false;
  const t0 = ctx.currentTime;
  await new Promise(resolve => setTimeout(resolve, 100));
  return ctx.state === 'running' && ctx.currentTime === t0;
}

interface UseVoiceOutputResult {
  state:     VoiceOutputState;
  speak:     (text: string) => Promise<void>;
  stop:      () => void;
  isSpeaking: boolean;
}

export function useVoiceOutput(
  options: UseVoiceOutputOptions = {}
): UseVoiceOutputResult {
  const { lang = 'pt-BR' } = options;

  const [state, setState]        = useState<VoiceOutputState>('idle');
  const audioRef                 = useRef<HTMLAudioElement | null>(null);
  const desktopContextRef        = useRef<AudioContext | null>(null);
  const desktopSourceRef         = useRef<AudioBufferSourceNode | null>(null);
  const revealCancelRef          = useRef<boolean>(false);
  const revealTimerRef           = useRef<ReturnType<typeof setTimeout>>();
  const iosPlaybackRef           = useRef<IOSPlayback | null>(null);

  // setTimeout recursivo elimina o race condition do setInterval:
  // cada próximo tick só é agendado DENTRO do callback,
  // então revealCancelRef é sempre verificada antes de qualquer execução.
  function startReveal(
    text: string,
    onWordReveal: (visible: string) => void
  ): void {
    const words = text.trim().split(/\s+/);
    let index   = 0;
    revealCancelRef.current = false;

    function next() {
      if (revealCancelRef.current) return;
      index++;
      onWordReveal(words.slice(0, index).join(' '));
      if (index < words.length) {
        revealTimerRef.current = setTimeout(next, 340);
      }
    }

    revealTimerRef.current = setTimeout(next, 340);
  }

  function stopReveal() {
    revealCancelRef.current = true;
    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = undefined;
  }

  // ── Web Speech API ────────────────────────────────────────────
  function speakWithBrowser(
    text:          string,
    speakLang:     string,
    onSpeakStart?: () => void,
    onWordReveal?: (v: string) => void,
    onSpeakEnd?:   () => void,
  ): boolean {
    if (!window.speechSynthesis) return false;
    window.speechSynthesis.cancel();

    const sentences =
      text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean)
      ?? [text];
    let index = 0;

    function speakNext() {
      if (index >= sentences.length) {
        stopReveal();
        setState('idle');
        onSpeakEnd?.();
        return;
      }

      const utterance      = new SpeechSynthesisUtterance(sentences[index]);
      utterance.lang       = speakLang;
      utterance.rate       = 1.15;
      utterance.pitch      = 1.05;
      utterance.volume     = 1.0;

      const voices     = window.speechSynthesis.getVoices();
      const langPrefix = speakLang.split('-')[0];
      const preferred  = voices.find(v =>
        v.lang.startsWith(langPrefix) &&
        (v.name.includes('premium') || v.name.includes('Premium') ||
         v.name.includes('enhanced') || v.name.includes('Enhanced') ||
         v.name.includes('Google')   || v.name.includes('Wavenet'))
      );
      const fallback = voices.find(v => v.lang.startsWith(langPrefix));
      if (preferred ?? fallback) utterance.voice = preferred ?? fallback!;

      utterance.onstart = () => {
        if (index === 0) {
          setState('speaking');
          onSpeakStart?.();
          if (onWordReveal) startReveal(text, onWordReveal);
        }
      };
      utterance.onend   = () => { index++; speakNext(); };
      utterance.onerror = () => {
        stopReveal();
        setState('idle');
        onSpeakEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakNext();
      };
    } else {
      speakNext();
    }
    return true;
  }

  // ── speak() principal ─────────────────────────────────────────
  async function speak(text: string) {
    if (!text?.trim()) return;

    window.speechSynthesis?.cancel();
    stopReveal();
    // iOS: invalida o fim-de-fala da reprodução anterior (onended atrasado
    // ou watchdog pendente) — a transição de fim nunca pode rodar duas vezes
    if (iosPlaybackRef.current) {
      iosPlaybackRef.current.ended = true;
      clearTimeout(iosPlaybackRef.current.watchdog);
      iosPlaybackRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (desktopSourceRef.current) {
      try { desktopSourceRef.current.stop(); } catch { /* já parado */ }
      desktopSourceRef.current = null;
    }
    if (desktopContextRef.current) {
      desktopContextRef.current.close();
      desktopContextRef.current = null;
    }

    const useTTS = !!options?.avatarId;

    if (useTTS) {
      setState('loading');
      options.onTTSChars?.(text.length);

      try {
        const response = await authedFetch('/api/tts', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            text,
            avatarId:  options?.avatarId  ?? 'sarah',
            lang:      options?.lang      ?? 'pt-BR',
            sessionId: options?.sessionId ?? 'unknown',
          }),
        });

        if (!response.ok) {
          const started = speakWithBrowser(
            text, options?.lang ?? 'pt-BR',
            options.onSpeakStart, options.onWordReveal, options.onSpeakEnd
          );
          if (!started) {
            setState('idle');
            options.onSpeakEnd?.();
            options.onError?.();
          }
          return;
        }

        // Caminho iOS: usar AudioContext desbloqueado pelo toque do usuário.
        // Resolvido AGORA, via ref — o snapshot `options.audioContext` da
        // renderização fica obsoleto quando o contexto nasce no toque de
        // unlock (closure antiga entregava undefined → caía no caminho
        // desktop → contexto sem gesto → 'suspended' → mudo no iOS).
        const iosCtx = options?.audioContextRef?.current
          ?? options?.audioContext
          ?? null;

        if (iosCtx) {
          try {
            let ctx = iosCtx;
            // iOS re-suspende o contexto quando ele fica ocioso entre o
            // toque de desbloqueio e o start() (turn + TTS + decode levam
            // segundos). start() em contexto 'suspended' falha em silêncio.
            if (ctx.state !== 'running') {
              await ctx.resume();
            }

            // 'running' congelado (currentTime parado): tentar destravar com
            // suspend/resume; se persistir, recriar o contexto. Recriação é
            // SÓ recuperação de falha — a operação normal continua sendo um
            // único contexto persistente por sessão (Regra 8).
            if (await isContextFrozen(ctx)) {
              try { await ctx.suspend(); await ctx.resume(); } catch { /* tenta recriar */ }
              if (await isContextFrozen(ctx)) {
                try {
                  const novoCtx = new AudioContext();
                  if (novoCtx.state !== 'running') await novoCtx.resume();
                  try { void ctx.close(); } catch { /* contexto congelado */ }
                  ctx = novoCtx;
                  if (options.audioContextRef) options.audioContextRef.current = novoCtx;
                  options.onAudioContextRecreated?.(novoCtx);
                } catch { /* segue com o contexto original */ }
              }
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const source   = ctx.createBufferSource();
            source.buffer  = audioBuffer;
            const gainNode = ctx.createGain();
            gainNode.gain.value = 2.2;
            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Fim de fala único: onended OU watchdog, o que vier primeiro.
            // A flag + clearTimeout garantem que a transição roda uma única
            // vez — dupla execução duplicaria a mensagem (Regra 3).
            const playback: IOSPlayback = { ended: false };
            iosPlaybackRef.current = playback;
            const finishOnce = () => {
              if (playback.ended) return;
              playback.ended = true;
              clearTimeout(playback.watchdog);
              stopReveal();
              setState('idle');
              options?.onSpeakEnd?.();
            };

            source.onended = finishOnce;

            // decode é assíncrono — o iOS pode ter re-suspendido o
            // contexto nesse intervalo; checar de novo antes do start
            if (ctx.state !== 'running') {
              await ctx.resume();
            }
            source.start(0);
            // Watchdog: se onended nunca disparar (contexto congelou após o
            // start), força a mesma transição de fim — sem isso o estado
            // fica preso em 'speaking' e o microfone nunca libera
            playback.watchdog = setTimeout(
              finishOnce,
              audioBuffer.duration * 1000 + 3000
            );
            // Estado muda APÓS start — não antes — para que isThinking
            // permaneça true durante todo o carregamento do TTS
            setState('speaking');
            options?.onSpeakStart?.();
            if (options?.onWordReveal) startReveal(text, options.onWordReveal);
            return;
          } catch {
            // fallback
          }
        }
        // Atenção: no iOS este ponto só deve ser alcançado como fallback de
        // erro — o caminho desktop abaixo cria AudioContext sem gesto, que
        // no iOS nasce 'suspended' e toca mudo.

        // Caminho desktop — amplificado via GainNode
        const audioBlob   = await response.blob();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx    = new AudioContext();
        desktopContextRef.current = audioCtx;

        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source      = audioCtx.createBufferSource();
        source.buffer     = audioBuffer;

        const gainNode        = audioCtx.createGain();
        gainNode.gain.value   = 2.2;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        desktopSourceRef.current = source;

        source.onended = () => {
          stopReveal();
          setState('idle');
          audioCtx.close();
          desktopContextRef.current = null;
          desktopSourceRef.current  = null;
          options?.onSpeakEnd?.();
        };

        source.start(0);
        // Estado muda APÓS start — não antes — para que isThinking
        // permaneça true durante todo o carregamento do TTS
        setState('speaking');
        options?.onSpeakStart?.();
        if (options?.onWordReveal) startReveal(text, options.onWordReveal);

      } catch {
        try {
          const started = speakWithBrowser(
            text, options?.lang ?? 'pt-BR',
            options.onSpeakStart, options.onWordReveal, options.onSpeakEnd
          );
          if (!started) {
            setState('idle');
            options.onSpeakEnd?.();
            options.onError?.();
          }
        } catch {
          setState('idle');
          options.onSpeakEnd?.();
          options.onError?.();
        }
      }

    } else {
      speakWithBrowser(
        text, lang,
        options.onSpeakStart, options.onWordReveal, options.onSpeakEnd
      );
    }
  }

  function stop() {
    window.speechSynthesis?.cancel();
    stopReveal();
    // iOS: invalida onended/watchdog pendentes — stop() já faz a transição
    if (iosPlaybackRef.current) {
      iosPlaybackRef.current.ended = true;
      clearTimeout(iosPlaybackRef.current.watchdog);
      iosPlaybackRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (desktopSourceRef.current) {
      try { desktopSourceRef.current.stop(); } catch { /* já parado */ }
      desktopSourceRef.current = null;
    }
    if (desktopContextRef.current) {
      desktopContextRef.current.close();
      desktopContextRef.current = null;
    }
    setState('idle');
    options?.onSpeakEnd?.();
  }

  return { state, speak, stop, isSpeaking: state === 'speaking' };
}
