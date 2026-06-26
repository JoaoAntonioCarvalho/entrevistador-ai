'use client';

import { AvatarFace }      from './AvatarFace';
import { ListeningWaves }  from './ListeningWaves';
import { AVATAR_PROFILES } from '@/lib/constants';
import { AvatarProfile, resolveAvatarProfile } from '@/lib/types';

interface Props {
  avatarId:       'sarah' | 'carlos' | 'alex';
  isSpeaking:     boolean;
  isListening:    boolean;
  isThinking:     boolean;
  size?:          'normal' | 'large';
  customProfile?: AvatarProfile;
  idioma?:        'pt' | 'en';
  isDark?:        boolean;
}

// Tom de pele neutro quente — substitui as cores vibrantes por avatar
const SKIN_TONE = '#c8a882';

export default function AvatarDisplay({
  avatarId,
  isSpeaking,
  isListening,
  isThinking,
  size = 'normal',
  customProfile,
  idioma = 'pt',
  isDark = true,
}: Props) {
  const rawProfile = customProfile ?? AVATAR_PROFILES.find(p => p.id === avatarId) ?? AVATAR_PROFILES[0];
  const profile    = resolveAvatarProfile(rawProfile, idioma);

  const faceSize = size === 'large' ? 200 : 160;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">

      {/* Container do avatar */}
      <div className="relative flex items-center justify-center"
           style={{ width: faceSize + 80, height: faceSize + 80 }}>

        {/* Ondas de escuta — FORA do círculo clipado */}
        <ListeningWaves
          isActive={isListening}
          color={isDark ? '#71717a' : '#a1a1aa'}
          size={faceSize}
        />

        {/* Rings de fala — FORA do círculo clipado */}
        {isSpeaking && (
          <>
            <div
              className="absolute rounded-full border-2 animate-ping opacity-20 border-zinc-300 dark:border-zinc-600"
              style={{ width: faceSize + 32, height: faceSize + 32, zIndex: 3 }}
            />
            <div
              className="absolute rounded-full border opacity-25 animate-pulse border-zinc-200 dark:border-zinc-700"
              style={{ width: faceSize + 16, height: faceSize + 16, zIndex: 3 }}
            />
          </>
        )}

        {/* Glow sutil — zinc neutro */}
        <div
          className="absolute rounded-full blur-3xl transition-opacity duration-500"
          style={{
            width:           faceSize * 0.9,
            height:          faceSize * 0.9,
            backgroundColor: '#a1a1aa',
            opacity:         isSpeaking ? 0.08 : isListening ? 0.04 : 0.02,
            zIndex:          0,
          }}
        />

        {/* Círculo clipado COM o avatar dentro */}
        <div
          className="absolute rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700"
          style={{
            width:           faceSize + 64,
            height:          faceSize + 64,
            backgroundColor: isDark ? '#3f3f46' : '#f4f4f5',
            zIndex:          2,
          }}
        >
          <div style={{ position: 'absolute', left: 32, top: 32, width: faceSize, height: faceSize }}>
            <AvatarFace
              isSpeaking={isSpeaking}
              isListening={isListening}
              isThinking={isThinking}
              color={SKIN_TONE}
              size={faceSize}
              avatarId={avatarId}
            />
          </div>
        </div>

        {/* Pontinhos de pensando — FORA do círculo */}
        {isThinking && !isSpeaking && !isListening && (
          <div
            className="absolute flex gap-1"
            style={{ bottom: faceSize * 0.05, right: faceSize * 0.05, zIndex: 4 }}
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Nome e título */}
      <div className="mt-4 text-center">
        <p className="font-semibold text-base leading-tight text-zinc-900 dark:text-white">
          {profile.nome}
        </p>
        <p className="text-xs mt-0.5 text-zinc-500 dark:text-zinc-400">
          {profile.titulo ?? profile.titulo_pt}
        </p>
      </div>

      {/* Status de voz */}
      <div className="mt-2 h-5 flex items-center justify-center">
        {isSpeaking && (
          <div className="flex items-end gap-0.5 h-4">
            {[3, 5, 7, 5, 3, 6, 4, 7, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full animate-bounce bg-zinc-400 dark:bg-zinc-500"
                style={{
                  height:            `${h}px`,
                  animationDelay:    `${i * 80}ms`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </div>
        )}
        {isListening && !isSpeaking && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse bg-zinc-400 dark:bg-zinc-500" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {idioma === 'en' ? 'Listening' : 'Ouvindo'}
            </span>
          </div>
        )}
        {isThinking && !isSpeaking && !isListening && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {idioma === 'en' ? 'Thinking...' : 'Pensando...'}
          </span>
        )}
      </div>
    </div>
  );
}
