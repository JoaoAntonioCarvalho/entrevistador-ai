'use client';

import { useRef, useState } from 'react';

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

  const [state, setState]    = useState<VoiceOutputState>('idle');
  const audioRef             = useRef<HTMLAudioElement | null>(null);
  const revealCancelRef      = useRef<boolean>(false);
  const revealTimerRef       = useRef<ReturnType<typeof setTimeout>>();

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const useElevenLabs =
      process.env.NEXT_PUBLIC_USE_ELEVENLABS === 'true' &&
      options?.voiceId;

    if (useElevenLabs) {
      setState('loading');
      options.onTTSChars?.(text.length);

      try {
        const response = await fetch('/api/tts', {
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

        // Caminho iOS: usar AudioContext desbloqueado pelo toque do usuário
        if (options?.audioContext) {
          try {
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await options.audioContext.decodeAudioData(arrayBuffer);
            const source = options.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(options.audioContext.destination);

            source.onended = () => {
              stopReveal();
              setState('idle');
              options?.onSpeakEnd?.();
            };

            setState('speaking');
            options?.onSpeakStart?.();
            if (options?.onWordReveal) startReveal(text, options.onWordReveal);

            source.start(0);
            return;
          } catch {
            // fallback
          }
        }

        // Caminho desktop — não alterar
        const audioBlob = await response.blob();
        const audioUrl  = URL.createObjectURL(audioBlob);
        const audio     = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setState('speaking');
          options?.onSpeakStart?.();
          if (options?.onWordReveal) {
            startReveal(text, options.onWordReveal);
          }
        };

        audio.onended = () => {
          stopReveal();
          setState('idle');
          URL.revokeObjectURL(audioUrl);
          options?.onSpeakEnd?.();
        };

        audio.onerror = () => {
          stopReveal();
          setState('idle');
          URL.revokeObjectURL(audioUrl);
          options?.onError?.();
        };

        await audio.play();

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState('idle');
    options?.onSpeakEnd?.();
  }

  return { state, speak, stop, isSpeaking: state === 'speaking' };
}
