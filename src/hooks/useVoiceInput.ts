'use client'

import { useRef, useState, useEffect, useCallback } from 'react';

type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error';

interface UseVoiceInputOptions {
  lang?: string;
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions) {
  const [state, setState]               = useState<VoiceInputState>('idle');
  const [transcript, setTranscript]     = useState('');
  const [interimTranscript, setInterim] = useState('');
  const [isSupported, setIsSupported]   = useState(false);

  const recognitionRef        = useRef<SpeechRecognition | null>(null);
  const finalTextRef          = useRef('');
  const isStoppingRef         = useRef(false);
  const hasCalledbackRef      = useRef(false);
  const startTimeRef          = useRef(0);
  const processingTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs que sempre apontam para a versão mais recente das callbacks.
  // Isso evita que o recognition capture closures desatualizadas e
  // elimina a necessidade de recriar o recognition quando os callbacks mudam.
  const onTranscriptRef = useRef(options.onTranscript);
  const onErrorRef      = useRef(options.onError);

  useEffect(() => { onTranscriptRef.current = options.onTranscript; }, [options.onTranscript]);
  useEffect(() => { onErrorRef.current = options.onError; },          [options.onError]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setIsSupported(true);

    const recognition = new SR();
    recognition.lang            = options.lang ?? 'pt-BR';
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTextRef.current += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setInterim(interim);
    };

    recognition.onend = () => {
      if (isStoppingRef.current) {
        isStoppingRef.current = false;

        const text = finalTextRef.current.trim();
        finalTextRef.current = '';
        setInterim('');

        if (!text) {
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          setState('idle');
          return;
        }

        const duration  = Date.now() - startTimeRef.current;
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        if (wordCount < 2 && duration < 1500) {
          setState('idle');
          return;
        }

        // Proteção contra chamada dupla
        if (hasCalledbackRef.current) {
          setState('idle');
          return;
        }

        hasCalledbackRef.current = true;
        setTranscript(text);
        setState('processing');

        // Chama sempre a versão mais recente via ref
        onTranscriptRef.current(text);

        setTimeout(() => { hasCalledbackRef.current = false; }, 2000);
        return;
      }

      // Browser encerrou por silêncio — reiniciar se ainda ativo
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* já rodando */ }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setState('error');
      onErrorRef.current?.(event.error);
      setTimeout(() => setState('idle'), 2000);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch { /* silencioso */ }
      recognitionRef.current = null;
    };
  // lang é a única dependência — callbacks são acessados via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.lang]);

  const startListening = useCallback(() => {
    if (state !== 'idle') return;
    finalTextRef.current     = '';
    hasCalledbackRef.current = false;
    isStoppingRef.current    = false;
    startTimeRef.current     = Date.now();
    setTranscript('');
    setInterim('');
    setState('listening');
    try { recognitionRef.current?.start(); } catch { /* já rodando */ }
  }, [state]);

  const stopListening = useCallback(() => {
    if (state !== 'listening') return;
    isStoppingRef.current = true;
    setState('processing');
    try { recognitionRef.current?.stop(); } catch { /* silencioso */ }

    // Timeout de segurança: se processing durar > 30s sem resposta, resetar
    processingTimeoutRef.current = setTimeout(() => {
      processingTimeoutRef.current = null;
      setState('idle');
      setTranscript('');
      setInterim('');
      finalTextRef.current     = '';
      hasCalledbackRef.current = false;
      isStoppingRef.current    = false;
      onErrorRef.current?.('Tempo limite excedido. Tente novamente.');
    }, 30000);
  }, [state]);

  const resetState = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    setState('idle');
    setTranscript('');
    setInterim('');
    finalTextRef.current     = '';
    hasCalledbackRef.current = false;
    isStoppingRef.current    = false;
  }, []);

  return { state, transcript, interimTranscript, isSupported, startListening, stopListening, resetState };
}
