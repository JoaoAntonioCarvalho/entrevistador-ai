'use client'

import { useEffect, useRef, useState } from 'react';

interface AvatarFaceProps {
  isSpeaking:  boolean;
  isListening: boolean;
  isThinking:  boolean;
  color:       string;
  size:        number;
  avatarId?:   string;
}

const HAIR    = '#0d0d0d';
const HAIR_HL = '#2a2a2a';
const BROW    = 'rgba(15,15,15,0.85)';
const DARK    = '#1a1a2e';

const FRAMES = [
  { o: 0.04, w: 0.30 }, { o: 0.11, w: 0.33 },
  { o: 0.20, w: 0.36 }, { o: 0.28, w: 0.38 },
  { o: 0.23, w: 0.37 }, { o: 0.14, w: 0.34 },
  { o: 0.07, w: 0.31 }, { o: 0.17, w: 0.35 },
  { o: 0.25, w: 0.37 }, { o: 0.10, w: 0.32 },
];

export function AvatarFace({
  isSpeaking, isListening, isThinking,
  color, size, avatarId = 'sarah',
}: AvatarFaceProps) {
  const timerRef              = useRef<ReturnType<typeof setTimeout>>();
  const [frame, setFrame]     = useState(0);
  const [blink, setBlink]     = useState(true);
  const [brow,  setBrow]      = useState(0);
  const [tilt,  setTilt]      = useState(0);
  const [cheek, setCheek]     = useState(0.13);

  useEffect(() => {
    if (isSpeaking) {
      const go = () => {
        setFrame(f => (f + 1) % FRAMES.length);
        timerRef.current = setTimeout(go, 72 + Math.random() * 60);
      };
      go();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFrame(0);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isSpeaking]);

  useEffect(() => {
    function sched() {
      return setTimeout(() => {
        setBlink(false);
        setTimeout(() => { setBlink(true); sched(); }, 115);
      }, 2800 + Math.random() * 3200);
    }
    const t = sched();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isListening)     { setBrow(0.75); setTilt(3.5);  setCheek(0.18); }
    else if (isSpeaking) { setBrow(0.25); setTilt(0);    setCheek(0.28); }
    else if (isThinking) { setBrow(0.08); setTilt(-2.5); setCheek(0.09); }
    else                 { setBrow(0.10); setTilt(0);    setCheek(0.13); }
  }, [isListening, isSpeaking, isThinking]);

  const s  = size;
  const cx = s / 2;
  const cy = s / 2;

  // Boca
  const mouthY = cy + s * 0.205;
  const mf     = isSpeaking ? FRAMES[frame] : { o: 0.034, w: 0.33 };
  const mw     = mf.w * s;
  const mh     = mf.o * s;
  const smile  = isSpeaking ? 0 : s * 0.038;

  // Olhos
  const eyeY  = cy - s * 0.04;
  const eyeX  = s * 0.133;
  const erx   = avatarId === 'carlos' ? s * 0.064 : s * 0.072;
  const ery   = blink
    ? (avatarId === 'sarah' ? s * 0.082 : s * 0.074)
    : s * 0.006;
  const pr    = s * 0.031;

  // Sobrancelhas
  const browY = eyeY - s * 0.118 - brow * s * 0.030;
  const browW = avatarId === 'carlos' ? s * 0.140 : s * 0.122;
  const browT = avatarId === 'carlos' ? s * 0.026 : s * 0.018;
  const arch  = avatarId === 'carlos' ? 0.60 : 1.30;

  // Nariz
  const noseY = cy + s * 0.072;
  const noseW = avatarId === 'carlos' ? s * 0.072 : s * 0.054;
  const noseH = avatarId === 'carlos' ? s * 0.058 : s * 0.044;

  // Bigode (Carlos)
  const mustY = mouthY - s * 0.068;

  const gid = `g${avatarId}`;

  /* ── Funções de caminho de cabeça ── */
  function headPath(): string {
    if (avatarId === 'carlos') {
      return `
        M ${cx} ${s * 0.055}
        C ${s * 0.72} ${s * 0.040} ${s * 0.915} ${s * 0.240} ${s * 0.915} ${s * 0.450}
        C ${s * 0.915} ${s * 0.680} ${s * 0.800} ${s * 0.840} ${cx} ${s * 0.895}
        C ${s * 0.200} ${s * 0.840} ${s * 0.085} ${s * 0.680} ${s * 0.085} ${s * 0.450}
        C ${s * 0.085} ${s * 0.240} ${s * 0.280} ${s * 0.040} ${cx} ${s * 0.055}
        Z`;
    }
    if (avatarId === 'sarah') {
      return `
        M ${cx} ${s * 0.045}
        C ${s * 0.74} ${s * 0.038} ${s * 0.930} ${s * 0.250} ${s * 0.930} ${s * 0.460}
        C ${s * 0.930} ${s * 0.680} ${s * 0.820} ${s * 0.855} ${cx} ${s * 0.900}
        C ${s * 0.180} ${s * 0.855} ${s * 0.070} ${s * 0.680} ${s * 0.070} ${s * 0.460}
        C ${s * 0.070} ${s * 0.250} ${s * 0.260} ${s * 0.038} ${cx} ${s * 0.045}
        Z`;
    }
    return `
      M ${cx} ${s * 0.048}
      C ${s * 0.73} ${s * 0.038} ${s * 0.922} ${s * 0.248} ${s * 0.922} ${s * 0.455}
      C ${s * 0.922} ${s * 0.675} ${s * 0.810} ${s * 0.850} ${cx} ${s * 0.896}
      C ${s * 0.190} ${s * 0.850} ${s * 0.078} ${s * 0.675} ${s * 0.078} ${s * 0.455}
      C ${s * 0.078} ${s * 0.248} ${s * 0.270} ${s * 0.038} ${cx} ${s * 0.048}
      Z`;
  }

  /* ── Cabelo preto ── */
  function hairBehind(): React.ReactNode {
    if (avatarId === 'sarah') {
      return (
        <g fill={HAIR}>
          <path d={`
            M ${cx - s * 0.52} ${s * 0.08}
            C ${cx - s * 0.68} ${s * 0.05} ${cx - s * 0.76} ${s * 0.25}
              ${cx - s * 0.74} ${s * 0.50}
            C ${cx - s * 0.72} ${s * 0.75} ${cx - s * 0.62} ${s * 0.95}
              ${cx - s * 0.50} ${s * 1.05}
            L ${cx + s * 0.50} ${s * 1.05}
            C ${cx + s * 0.62} ${s * 0.95} ${cx + s * 0.72} ${s * 0.75}
              ${cx + s * 0.74} ${s * 0.50}
            C ${cx + s * 0.76} ${s * 0.25} ${cx + s * 0.68} ${s * 0.05}
              ${cx + s * 0.52} ${s * 0.08}
            C ${cx + s * 0.35} ${s * 0.02} ${cx} ${s * -0.01}
              ${cx - s * 0.35} ${s * 0.02}
            Z`} />
        </g>
      );
    }
    if (avatarId === 'carlos') {
      return (
        <g fill={HAIR}>
          <path d={`
            M ${cx - s * 0.43} ${s * 0.12}
            C ${cx - s * 0.44} ${s * 0.02} ${cx - s * 0.10} ${s * -0.02}
              ${cx} ${s * -0.02}
            C ${cx + s * 0.10} ${s * -0.02} ${cx + s * 0.44} ${s * 0.02}
              ${cx + s * 0.43} ${s * 0.12}
            C ${cx + s * 0.44} ${s * 0.22} ${cx + s * 0.42} ${s * 0.28}
              ${cx + s * 0.40} ${s * 0.30}
            C ${cx + s * 0.30} ${s * 0.14} ${cx} ${s * 0.08}
              ${cx - s * 0.30} ${s * 0.14}
            C ${cx - s * 0.42} ${s * 0.28} ${cx - s * 0.44} ${s * 0.22}
              ${cx - s * 0.43} ${s * 0.12}
            Z`} />
          <path d={`
            M ${cx - s * 0.43} ${s * 0.30}
            C ${cx - s * 0.47} ${s * 0.35} ${cx - s * 0.47} ${s * 0.52}
              ${cx - s * 0.44} ${s * 0.55}
            C ${cx - s * 0.41} ${s * 0.52} ${cx - s * 0.40} ${s * 0.38}
              ${cx - s * 0.40} ${s * 0.30}
            Z`} />
          <path d={`
            M ${cx + s * 0.43} ${s * 0.30}
            C ${cx + s * 0.47} ${s * 0.35} ${cx + s * 0.47} ${s * 0.52}
              ${cx + s * 0.44} ${s * 0.55}
            C ${cx + s * 0.41} ${s * 0.52} ${cx + s * 0.40} ${s * 0.38}
              ${cx + s * 0.40} ${s * 0.30}
            Z`} />
        </g>
      );
    }
    return (
      <g fill={HAIR}>
        <path d={`
          M ${cx - s * 0.48} ${s * 0.10}
          C ${cx - s * 0.52} ${s * 0.03} ${cx - s * 0.15} ${s * -0.02}
            ${cx} ${s * -0.02}
          C ${cx + s * 0.15} ${s * -0.02} ${cx + s * 0.52} ${s * 0.03}
            ${cx + s * 0.48} ${s * 0.10}
          C ${cx + s * 0.50} ${s * 0.24} ${cx + s * 0.47} ${s * 0.32}
            ${cx + s * 0.44} ${s * 0.35}
          C ${cx + s * 0.34} ${s * 0.16} ${cx} ${s * 0.09}
            ${cx - s * 0.34} ${s * 0.16}
          C ${cx - s * 0.47} ${s * 0.32} ${cx - s * 0.50} ${s * 0.24}
            ${cx - s * 0.48} ${s * 0.10}
          Z`} />
        {[-1, 1].map(side => (
          <path key={side} d={`
            M ${cx + side * s * 0.44} ${s * 0.35}
            C ${cx + side * s * 0.47} ${s * 0.40}
              ${cx + side * s * 0.47} ${s * 0.54}
              ${cx + side * s * 0.43} ${s * 0.58}
            C ${cx + side * s * 0.40} ${s * 0.54}
              ${cx + side * s * 0.40} ${s * 0.40}
              ${cx + side * s * 0.40} ${s * 0.35}
            Z`} />
        ))}
      </g>
    );
  }

  function hairFront(): React.ReactNode {
    if (avatarId === 'sarah') {
      return (
        <path
          d={`
          M ${cx - s * 0.52} ${s * 0.08}
          C ${cx - s * 0.40} ${s * 0.03} ${cx - s * 0.10} ${s * 0.01}
            ${cx + s * 0.05} ${s * 0.04}
          C ${cx + s * 0.20} ${s * 0.07} ${cx + s * 0.40} ${s * 0.17}
            ${cx + s * 0.52} ${s * 0.08}
          C ${cx + s * 0.35} ${s * 0.24} ${cx - s * 0.10} ${s * 0.28}
            ${cx - s * 0.40} ${s * 0.22}
          Z`}
          fill={HAIR}
        />
      );
    }
    if (avatarId === 'carlos') {
      return (
        <g fill={HAIR}>
          <path d={`
            M ${cx - s * 0.38} ${s * 0.12}
            C ${cx - s * 0.28} ${s * 0.06} ${cx} ${s * 0.04}
              ${cx + s * 0.28} ${s * 0.06}
            C ${cx + s * 0.38} ${s * 0.12} ${cx + s * 0.35} ${s * 0.20}
              ${cx + s * 0.25} ${s * 0.22}
            C ${cx + s * 0.10} ${s * 0.14} ${cx - s * 0.10} ${s * 0.14}
              ${cx - s * 0.25} ${s * 0.22}
            C ${cx - s * 0.35} ${s * 0.20} ${cx - s * 0.38} ${s * 0.14}
              ${cx - s * 0.38} ${s * 0.12}
            Z`} />
        </g>
      );
    }
    return (
      <path
        d={`
        M ${cx - s * 0.46} ${s * 0.12}
        C ${cx - s * 0.30} ${s * 0.05} ${cx + s * 0.05} ${s * 0.04}
          ${cx + s * 0.35} ${s * 0.14}
        C ${cx + s * 0.30} ${s * 0.24} ${cx} ${s * 0.26}
          ${cx - s * 0.25} ${s * 0.23}
        Z`}
        fill={HAIR}
      />
    );
  }

  return (
    <svg
      width={s} height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={{
        transform:  `rotate(${tilt}deg)`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        overflow:   'visible',
      }}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.22" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* Sombra */}
      <ellipse
        cx={cx} cy={cy + s * 0.46}
        rx={s * 0.38} ry={s * 0.06}
        fill="rgba(0,0,0,0.20)"
      />

      {/* ── CABELO ATRÁS ── */}
      {hairBehind()}

      {/* ── PESCOÇO ── */}
      <path
        d={`M ${cx - s * 0.09} ${cy + s * 0.41}
            C ${cx - s * 0.09} ${s * 0.96}
              ${cx + s * 0.09} ${s * 0.96}
              ${cx + s * 0.09} ${cy + s * 0.41}`}
        fill={color}
      />

      {/* ── CABEÇA ── */}
      <path d={headPath()} fill={color} />
      <path d={headPath()} fill={`url(#${gid})`} />

      {/* ── ORELHAS ── */}
      {[-1, 1].map(side => (
        <g key={side}>
          <ellipse
            cx={cx + side * s * 0.44}
            cy={cy + s * 0.02}
            rx={s * 0.048} ry={s * 0.068}
            fill={color}
            stroke={color} strokeWidth={1}
          />
          <ellipse
            cx={cx + side * s * 0.44}
            cy={cy + s * 0.02}
            rx={s * 0.026} ry={s * 0.038}
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={s * 0.012}
          />
        </g>
      ))}

      {/* ── BOCHECHAS ── */}
      {[-1, 1].map(side => (
        <ellipse key={side}
          cx={cx + side * s * 0.220}
          cy={cy + s * 0.115}
          rx={s * 0.110} ry={s * 0.068}
          fill="rgba(220,80,80,1)"
          opacity={cheek}
          style={{ transition: 'opacity 0.5s ease' }}
        />
      ))}

      {/* ── SOBRANCELHAS ── */}
      {[-1, 1].map(side => (
        <path key={side}
          d={`
          M ${cx + side * (eyeX - browW * 0.52)} ${browY + browT * 0.5}
          Q ${cx + side * eyeX}
            ${browY - browT * arch - brow * s * 0.012}
          ${cx + side * (eyeX + browW * 0.52)} ${browY + browT * 0.5}`}
          fill="none"
          stroke={BROW}
          strokeWidth={browT}
          strokeLinecap="round"
          style={{ transition: 'all 0.3s ease' }}
        />
      ))}

      {/* ── OLHOS ── */}
      {[-1, 1].map(side => {
        const ex = cx + side * eyeX;
        return (
          <g key={side}>
            <path
              d={`M ${ex - erx} ${eyeY}
                  C ${ex - erx} ${eyeY - ery}
                    ${ex + erx} ${eyeY - ery}
                    ${ex + erx} ${eyeY}
                  C ${ex + erx} ${eyeY + ery * 0.70}
                    ${ex - erx} ${eyeY + ery * 0.70}
                    ${ex - erx} ${eyeY} Z`}
              fill="white"
              style={{ transition: 'all 0.08s ease' }}
            />
            {blink && (
              <>
                <circle
                  cx={ex + s * 0.006} cy={eyeY + s * 0.008}
                  r={pr} fill={DARK}
                />
                <circle
                  cx={ex + s * 0.006 + pr * 0.38}
                  cy={eyeY + s * 0.008 - pr * 0.38}
                  r={pr * 0.36} fill="white" opacity={0.95}
                />
                <circle
                  cx={ex + s * 0.006 - pr * 0.18}
                  cy={eyeY + s * 0.008 + pr * 0.20}
                  r={pr * 0.17} fill="white" opacity={0.50}
                />
              </>
            )}
            {avatarId !== 'carlos' && blink && (
              <line
                x1={ex} y1={eyeY - ery * 0.90}
                x2={ex} y2={eyeY - ery * 1.25}
                stroke="rgba(10,10,10,0.55)"
                strokeWidth={s * 0.012}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}

      {/* ── NARIZ ── */}
      <path
        d={`M ${cx} ${noseY}
            q ${-noseW * 0.45} ${noseH * 0.65} ${-noseW * 0.82} ${noseH}
            m ${noseW * 0.25} 0
            a ${noseW * 0.28} ${noseH * 0.22} 0 0 0 ${noseW * 1.14} 0
            m ${noseW * 0.25} 0
            q ${noseW * 0.37} ${-noseH * 0.35} 0 ${-noseH}`}
        fill="none"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={s * 0.016}
        strokeLinecap="round"
      />

      {/* ── BIGODE — Carlos ── */}
      {avatarId === 'carlos' && (
        <g>
          <path
            d={`M ${cx - s * 0.02} ${mustY}
                C ${cx - s * 0.08} ${mustY + s * 0.008}
                  ${cx - s * 0.20} ${mustY + s * 0.015}
                  ${cx - s * 0.22} ${mustY - s * 0.010}
                C ${cx - s * 0.24} ${mustY - s * 0.028}
                  ${cx - s * 0.18} ${mustY - s * 0.038}
                  ${cx - s * 0.10} ${mustY - s * 0.025}
                C ${cx - s * 0.06} ${mustY - s * 0.018}
                  ${cx - s * 0.02} ${mustY - s * 0.008}
                  ${cx} ${mustY - s * 0.005}
                Z`}
            fill={HAIR}
            opacity={0.88}
          />
          <path
            d={`M ${cx + s * 0.02} ${mustY}
                C ${cx + s * 0.08} ${mustY + s * 0.008}
                  ${cx + s * 0.20} ${mustY + s * 0.015}
                  ${cx + s * 0.22} ${mustY - s * 0.010}
                C ${cx + s * 0.24} ${mustY - s * 0.028}
                  ${cx + s * 0.18} ${mustY - s * 0.038}
                  ${cx + s * 0.10} ${mustY - s * 0.025}
                C ${cx + s * 0.06} ${mustY - s * 0.018}
                  ${cx + s * 0.02} ${mustY - s * 0.008}
                  ${cx} ${mustY - s * 0.005}
                Z`}
            fill={HAIR}
            opacity={0.88}
          />
          <path
            d={`M ${cx} ${mustY} L ${cx} ${mustY + s * 0.022}`}
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={s * 0.014}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* ── BOCA ── */}
      {mh > s * 0.024 ? (
        <g>
          <path
            d={`M ${cx - mw * 0.48} ${mouthY}
                C ${cx - mw * 0.45} ${mouthY + mh * 0.20}
                  ${cx - mw * 0.30} ${mouthY + mh * 0.50}
                  ${cx} ${mouthY + mh * 0.50}
                C ${cx + mw * 0.30} ${mouthY + mh * 0.50}
                  ${cx + mw * 0.45} ${mouthY + mh * 0.20}
                  ${cx + mw * 0.48} ${mouthY}
                C ${cx + mw * 0.45} ${mouthY - mh * 0.15}
                  ${cx + mw * 0.25} ${mouthY - mh * 0.30}
                  ${cx} ${mouthY - mh * 0.30}
                C ${cx - mw * 0.25} ${mouthY - mh * 0.30}
                  ${cx - mw * 0.45} ${mouthY - mh * 0.15}
                  ${cx - mw * 0.48} ${mouthY} Z`}
            fill={DARK}
            style={{ transition: 'all 0.07s ease' }}
          />
          {mh > s * 0.08 && (
            <ellipse
              cx={cx} cy={mouthY - mh * 0.10}
              rx={mw * 0.33} ry={mh * 0.23}
              fill="white"
            />
          )}
          <path
            d={`M ${cx - mw * 0.42} ${mouthY + mh * 0.48}
                Q ${cx} ${mouthY + mh * 0.68}
                  ${cx + mw * 0.42} ${mouthY + mh * 0.48}`}
            fill="none"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth={s * 0.016}
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g>
          <path
            d={`M ${cx - mw * 0.46} ${mouthY}
                C ${cx - mw * 0.28} ${mouthY - mh * 1.2}
                  ${cx - mw * 0.08} ${mouthY - mh * 1.8}
                  ${cx} ${mouthY - mh * 1.6}
                C ${cx + mw * 0.08} ${mouthY - mh * 1.8}
                  ${cx + mw * 0.28} ${mouthY - mh * 1.2}
                  ${cx + mw * 0.46} ${mouthY}
                C ${cx + mw * 0.30} ${mouthY + smile * 0.7}
                  ${cx - mw * 0.30} ${mouthY + smile * 0.7}
                  ${cx - mw * 0.46} ${mouthY} Z`}
            fill="rgba(255,255,255,0.72)"
            style={{ transition: 'all 0.15s ease' }}
          />
          <path
            d={`M ${cx - mw * 0.42} ${mouthY + mh * 0.5}
                Q ${cx} ${mouthY + smile + mh * 0.8}
                  ${cx + mw * 0.42} ${mouthY + mh * 0.5}`}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={s * 0.020}
            strokeLinecap="round"
          />
          {[-1, 1].map(side => (
            <circle key={side}
              cx={cx + side * mw * 0.44}
              cy={mouthY + smile * 0.45}
              r={s * 0.012}
              fill="rgba(255,255,255,0.22)"
            />
          ))}
        </g>
      )}

      {/* ── CABELO FRENTE ── */}
      {hairFront()}

      {/* Fio de cabelo textura (Sarah) */}
      {avatarId === 'sarah' && (
        <g stroke={HAIR_HL} strokeWidth={s * 0.008}
           strokeLinecap="round" fill="none" opacity={0.5}>
          <path d={`M ${cx - s*0.38} ${s*0.18}
                    C ${cx - s*0.30} ${s*0.30} ${cx - s*0.28} ${s*0.50}
                      ${cx - s*0.32} ${s*0.70}`} />
          <path d={`M ${cx + s*0.38} ${s*0.18}
                    C ${cx + s*0.30} ${s*0.30} ${cx + s*0.28} ${s*0.50}
                      ${cx + s*0.32} ${s*0.70}`} />
        </g>
      )}

    </svg>
  );
}
