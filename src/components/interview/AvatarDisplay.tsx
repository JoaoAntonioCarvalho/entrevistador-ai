'use client';

import { AvatarFace }      from './AvatarFace';
import { ListeningWaves }  from './ListeningWaves';
import { AVATAR_PROFILES } from '@/lib/constants';
import { AvatarProfile, resolveAvatarProfile } from '@/lib/types';

type AvatarSize = 'small' | 'normal' | 'large';

interface Props {
  avatarId:       'sarah' | 'carlos' | 'alex';
  isSpeaking:     boolean;
  isListening:    boolean;
  isThinking:     boolean;
  size?:          AvatarSize;
  customProfile?: AvatarProfile;
  idioma?:        'pt' | 'en';
  isDark?:        boolean;
}

// Tom de pele neutro quente — uniforme para todos os avatares
const SKIN_TONE = '#c8a882';

// Dimensões por tamanho: face = SVG width/height; pad = espaçamento interno do círculo
const SIZE: Record<AvatarSize, { face: number; pad: number; outer: number }> = {
  small:  { face: 56,  pad: 12, outer: 16 },
  normal: { face: 160, pad: 32, outer: 40 },
  large:  { face: 200, pad: 36, outer: 44 },
};

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

  const { face: faceSize, pad: facePad, outer: outerPad } = SIZE[size];
  const circleSize    = faceSize + facePad * 2;
  const containerSize = faceSize + outerPad * 2;
  const isSmall       = size === 'small';

  return (
    <div className="flex flex-col items-center select-none">

      {/* Container relativo que acomoda círculo + rings externos */}
      <div className="relative flex items-center justify-center"
           style={{ width: containerSize, height: containerSize }}>

        {/* Ondas de escuta — FORA do círculo clipado (só em tamanhos normais) */}
        {!isSmall && (
          <ListeningWaves
            isActive={isListening}
            color={isDark ? '#71717a' : '#a1a1aa'}
            size={faceSize}
          />
        )}

        {/* Rings de fala — FORA do círculo clipado */}
        {isSpeaking && (
          <>
            <div
              className="absolute rounded-full border-2 animate-ping opacity-20 border-zinc-300 dark:border-zinc-600"
              style={{ width: circleSize + (isSmall ? 8 : 32), height: circleSize + (isSmall ? 8 : 32), zIndex: 3 }}
            />
            <div
              className="absolute rounded-full border opacity-25 animate-pulse border-zinc-200 dark:border-zinc-700"
              style={{ width: circleSize + (isSmall ? 4 : 16), height: circleSize + (isSmall ? 4 : 16), zIndex: 3 }}
            />
          </>
        )}

        {/* Glow sutil */}
        {!isSmall && (
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
        )}

        {/* Círculo clipado COM o avatar dentro */}
        <div
          className="absolute rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700"
          style={{
            width:           circleSize,
            height:          circleSize,
            backgroundColor: isDark ? '#3f3f46' : '#f4f4f5',
            zIndex:          2,
          }}
        >
          <div style={{ position: 'absolute', left: facePad, top: facePad, width: faceSize, height: faceSize }}>
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
      </div>

      {/* Nome e título */}
      <div className={`text-center ${isSmall ? 'mt-2' : 'mt-4'}`}>
        <p className={`font-semibold leading-tight text-zinc-900 dark:text-white ${isSmall ? 'text-sm' : 'text-base'}`}>
          {profile.nome}
        </p>
        <p className={`mt-0.5 text-zinc-500 dark:text-zinc-400 ${isSmall ? 'text-[11px]' : 'text-xs'}`}>
          {profile.titulo ?? profile.titulo_pt}
        </p>
      </div>

      {/* Status de voz (só em tamanho normal+) */}
      {!isSmall && (
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
      )}
    </div>
  );
}
