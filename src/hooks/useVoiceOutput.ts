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

  const [state, setState]        = useState<VoiceOutputState>('idle');
  const audioRef                 = useRef<HTMLAudioElement | null>(null);
  const desktopContextRef        = useRef<AudioContext | null>(null);
  const desktopSourceRef         = useRef<AudioBufferSourceNode | null>(null);
  const revealCancelRef          = useRef<boolean>(false);
  const revealTimerRef           = useRef<ReturnType<typeof setTimeout>>();

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
            const source   = options.audioContext.createBufferSource();
            source.buffer  = audioBuffer;
            const gainNode = options.audioContext.createGain();
            gainNode.gain.value = 2.2;
            source.connect(gainNode);
            gainNode.connect(options.audioContext.destination);

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

        setState('speaking');
        options?.onSpeakStart?.();
        if (options?.onWordReveal) startReveal(text, options.onWordReveal);

        source.start(0);

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
