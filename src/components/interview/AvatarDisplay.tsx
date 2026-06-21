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

const AVATAR_COLORS: Record<string, string> = {
  sarah:  '#7c3aed',
  carlos: '#2563eb',
  alex:   '#059669',
};

const WAVE_COLORS: Record<string, string> = {
  sarah:  '#a78bfa',
  carlos: '#60a5fa',
  alex:   '#34d399',
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

  const faceSize  = size === 'large' ? 220 : 180;
  const color     = AVATAR_COLORS[avatarId] ?? '#7c3aed';
  const waveColor = WAVE_COLORS[avatarId]   ?? '#a78bfa';

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center relative select-none ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>

      {/* Container do avatar */}
      <div className="relative flex items-center justify-center"
           style={{ width: faceSize + 80, height: faceSize + 80 }}>

        {/* Ondas de escuta — FORA do círculo clipado */}
        <ListeningWaves isActive={isListening} color={waveColor} size={faceSize} />

        {/* Rings de fala — FORA do círculo clipado */}
        {isSpeaking && (
          <>
            <div className="absolute rounded-full border-2 animate-ping opacity-20"
                 style={{ width: faceSize + 32, height: faceSize + 32, borderColor: color, zIndex: 3 }} />
            <div className="absolute rounded-full border opacity-30 animate-pulse"
                 style={{ width: faceSize + 16, height: faceSize + 16, borderColor: color, zIndex: 3 }} />
          </>
        )}

        {/* Glow — FORA do círculo clipado */}
        <div
          className="absolute rounded-full blur-3xl transition-opacity duration-500"
          style={{
            width:           faceSize * 0.9,
            height:          faceSize * 0.9,
            backgroundColor: color,
            opacity:         isSpeaking ? 0.18 : isListening ? 0.08 : 0.05,
            zIndex:          0,
          }}
        />

        {/* Círculo clipado COM o avatar dentro */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            width:           faceSize + 64,
            height:          faceSize + 64,
            backgroundColor: isDark ? '#52525b' : '#e4e4e7',
            zIndex:          2,
          }}
        >
          <div style={{ position: 'absolute', left: 32, top: 32, width: faceSize, height: faceSize }}>
            <AvatarFace
              isSpeaking={isSpeaking}
              isListening={isListening}
              isThinking={isThinking}
              color={color}
              size={faceSize}
              avatarId={avatarId}
            />
          </div>
        </div>

        {/* Pontinhos de pensando — FORA do círculo */}
        {isThinking && !isSpeaking && !isListening && (
          <div className="absolute flex gap-1"
               style={{ bottom: faceSize * 0.05, right: faceSize * 0.05, zIndex: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i}
                   className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                   style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>

      {/* Nome e título */}
      <div className="mt-4 text-center">
        <p className={`font-semibold text-base leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {profile.nome}
        </p>
        <p className="text-zinc-500 text-xs mt-0.5">
          {profile.titulo ?? profile.titulo_pt}
        </p>
      </div>

      {/* Status de voz */}
      <div className="mt-3 h-6 flex items-center justify-center">
        {isSpeaking && (
          <div className="flex items-end gap-0.5 h-5">
            {[3, 5, 7, 5, 3, 6, 4, 7, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full animate-bounce"
                style={{
                  height:            `${h}px`,
                  backgroundColor:   color,
                  animationDelay:    `${i * 80}ms`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </div>
        )}
        {isListening && !isSpeaking && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: waveColor }}
            />
            <span className="text-xs font-medium" style={{ color: waveColor }}>
              {idioma === 'en' ? 'Listening' : 'Ouvindo'}
            </span>
          </div>
        )}
        {isThinking && !isSpeaking && !isListening && (
          <span className="text-xs text-zinc-600">
            {idioma === 'en' ? 'Thinking...' : 'Pensando...'}
          </span>
        )}
      </div>
    </div>
  );
}
