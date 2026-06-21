'use client';

interface ListeningWavesProps {
  isActive: boolean;
  color:    string;
  size:     number;
}

export function ListeningWaves({ isActive, color, size }: ListeningWavesProps) {
  if (!isActive) return null;

  const baseR = size * 0.44;

  return (
    <svg
      width={size * 2}
      height={size * 2}
      viewBox={`0 0 ${size * 2} ${size * 2}`}
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top:  '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {[1, 2, 3].map(i => (
        <circle
          key={i}
          cx={size}
          cy={size}
          r={baseR + i * size * 0.12}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0}
          style={{
            animation:      'wave-expand 1.8s ease-out infinite',
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes wave-expand {
          0%   { r: ${baseR}px;                opacity: 0.6; }
          100% { r: ${baseR + size * 0.5}px;   opacity: 0;   }
        }
      `}</style>
    </svg>
  );
}
