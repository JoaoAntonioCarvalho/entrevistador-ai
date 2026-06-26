'use client';

import { useEffect, useRef } from 'react';
import type { ConversationTurn } from '@/lib/types';

interface Props {
  conversation:       ConversationTurn[];
  isListening:        boolean;
  interimTranscript?: string;
  lang?:              'pt' | 'en';
  isDark?:            boolean;
}

export default function TranscriptPanel({
  conversation,
  isListening,
  interimTranscript = '',
  lang = 'pt',
  isDark = true,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);
  const prevLengthRef  = useRef(0);
  const prevInterimRef = useRef('');

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

  // Scroll suave quando o candidato começa a falar (primeiro char interim)
  useEffect(() => {
    if (interimTranscript && !prevInterimRef.current && containerRef.current) {
      containerRef.current.scrollTo({
        top:      containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevInterimRef.current = interimTranscript;
  }, [interimTranscript]);

  const interviewerLabel = lang === 'en' ? 'Interviewer' : 'Entrevistador';
  const youLabel         = lang === 'en' ? 'You'         : 'Você';

  return (
    <div className="h-full flex flex-col">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-4 px-4 max-w-2xl mx-auto w-full"
      >
        {conversation.length === 0 && (
          <p className="text-center text-sm py-8 text-zinc-400 dark:text-zinc-600">
            {lang === 'en'
              ? 'The interview will start shortly...'
              : 'A entrevista vai começar em instantes...'}
          </p>
        )}

        <div className="space-y-6">
          {conversation.map((turn, i) => {
            const isInterviewer = turn.role === 'interviewer';
            return isInterviewer ? (
              <div key={i} className="space-y-1.5">
                <p className={`text-[11px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {interviewerLabel}
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {turn.text}
                </p>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-end space-y-1.5">
                <p className={`text-[11px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {youLabel}
                </p>
                <div className={`max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {turn.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bolha interim — texto sendo falado em tempo real */}
        {isListening && interimTranscript && (
          <div className="flex flex-col items-end mt-6 space-y-1.5">
            <p className={`text-[11px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {youLabel}
            </p>
            <div className={`max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 opacity-60 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <p className={`text-sm leading-relaxed italic ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {interimTranscript}
                <span className={`inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle ${isDark ? 'bg-zinc-400' : 'bg-zinc-500'}`} />
              </p>
            </div>
          </div>
        )}

        {/* Indicador de gravação — só quando ainda não há texto interim */}
        {isListening && !interimTranscript && (
          <div className="flex justify-end mt-4">
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-zinc-400" />
              {lang === 'en' ? 'Listening...' : 'Ouvindo...'}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
