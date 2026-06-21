'use client';

import { useEffect, useRef } from 'react';
import type { ConversationTurn } from '@/lib/types';

interface Props {
  conversation:  ConversationTurn[];
  isListening:   boolean;
  isThinking?:   boolean;
  visibleText?:  string;
  lang?:         'pt' | 'en';
  isDark?:       boolean;
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('pt-BR', {
      hour:   '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function TranscriptPanel({
  conversation,
  isListening,
  isThinking = false,
  visibleText = '',
  lang = 'pt',
  isDark = true,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);
  const prevLengthRef = useRef(0);

  // Marcar para scroll somente quando uma nova mensagem confirmada chega
  useEffect(() => {
    if (conversation.length > prevLengthRef.current) {
      prevLengthRef.current = conversation.length;
      shouldScrollRef.current = true;
    }
  }, [conversation.length]);

  // Executar scroll apenas quando sinalizado — nunca durante visibleText
  useEffect(() => {
    if (shouldScrollRef.current && containerRef.current) {
      containerRef.current.scrollTo({
        top:      containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      shouldScrollRef.current = false;
    }
  }, [conversation.length]);

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 border-l
                    border-zinc-800/50">

      {/* Header */}
      <div className={`px-4 py-3 border-b flex-shrink-0 ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
        <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          Transcrição
        </p>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">

        {conversation.length === 0 && !isThinking && !visibleText && (
          <p className="text-center text-zinc-600 text-sm py-8">
            {lang === 'en'
              ? 'The interview will start shortly...'
              : 'A entrevista vai começar em instantes...'}
          </p>
        )}

        <div className="space-y-3">
          {conversation.map((turn, i) => {
            const isInterviewer = turn.role === 'interviewer';
            return (
              <div key={i}
                   className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
                <div className="flex flex-col">
                  <div className={`max-w-[85%] text-sm leading-relaxed
                                   px-4 py-3 ${
                    isInterviewer
                      ? 'bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm'
                      : 'bg-zinc-700 text-zinc-100 rounded-2xl rounded-tr-sm'
                  }`}>
                    {turn.text}
                  </div>
                  <span className={`text-xs text-zinc-600 mt-1 ${
                    isInterviewer ? 'ml-1' : 'mr-1 text-right'
                  }`}>
                    {formatTime(turn.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estado atual — só um por vez */}
        {isThinking && !visibleText && (
          <div className="flex justify-start mt-3">
            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full
                                 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full
                                 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full
                                 animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs text-zinc-500 mt-1 block">
                {lang === 'en' ? 'Thinking...' : 'Pensando...'}
              </span>
            </div>
          </div>
        )}

        {visibleText && !isThinking && (() => {
          const lastMsg = conversation[conversation.length - 1];
          const isDuplicate = lastMsg?.role === 'interviewer' &&
            lastMsg?.text?.trim() === visibleText?.trim();

          if (isDuplicate) return null;

          return (
            <div className="flex justify-start mt-3">
              <div className="max-w-[85%] bg-zinc-800 text-zinc-200
                              text-sm leading-relaxed px-4 py-3
                              rounded-2xl rounded-tl-sm">
                {visibleText}
                <span className="inline-block w-0.5 h-3.5 bg-zinc-400
                                 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          );
        })()}

        {/* Indicador de gravação */}
        {isListening && (
          <div className="flex justify-end mt-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {lang === 'en' ? 'Listening...' : 'Ouvindo...'}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
