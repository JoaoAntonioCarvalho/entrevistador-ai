'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CameraOff } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

type Choice = 'pending' | 'granted' | 'denied';

export default function CameraCheckPage() {
  const router = useRouter();
  const { session } = useSessionStore();

  const [choice, setChoice] = useState<Choice>('pending');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Rota protegida
  useEffect(() => {
    if (!session.candidate) {
      router.push('/setup');
    }
  }, [session.candidate, router]);

  // Conecta stream ao elemento de vídeo
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  async function handleActivateCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s);
      setChoice('granted');
    } catch {
      setError('Não foi possível acessar a câmera.');
      setChoice('denied');
    }
  }

  function handleSkip() {
    sessionStorage.setItem('camera-enabled', 'false');
    router.push('/interview');
  }

  function handleStart() {
    sessionStorage.setItem('camera-enabled', 'true');
    router.push('/interview');
  }

  function handleDeniedStart() {
    sessionStorage.setItem('camera-enabled', 'false');
    router.push('/interview');
  }

  function handleCancelCamera() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    sessionStorage.setItem('camera-enabled', 'false');
    router.push('/interview');
  }

  if (!session.candidate) return null;

  return (
    <div className="min-h-dvh bg-background transition-colors duration-200">
      <Header />
      <div className="flex items-center justify-center px-4 min-h-[calc(100dvh-65px)]">
        <div className="w-full max-w-[480px] flex flex-col items-center gap-8 text-center">

          {/* PENDING */}
          {choice === 'pending' && (
            <>
              <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center">
                <Camera className="w-10 h-10 text-muted-fg" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-heading-sm text-foreground">
                  Deseja usar sua câmera?
                </h1>
                <p className="text-muted-fg text-sm leading-relaxed">
                  Ativar a câmera melhora a experiência e simula
                  uma entrevista mais realista.
                </p>
                {error && (
                  <p className="text-[#dc2626] text-sm mt-1">{error}</p>
                )}
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleActivateCamera}
                  className="flex-1 rounded-lg bg-foreground text-background
                             px-4 py-3 text-sm font-medium hover:opacity-90
                             transition-opacity"
                >
                  Sim, ativar câmera
                </button>
                <button
                  onClick={handleSkip}
                  className="flex-1 rounded-lg border border-border text-foreground
                             px-4 py-3 text-sm font-medium hover:bg-muted
                             transition-colors"
                >
                  Não, continuar sem câmera
                </button>
              </div>
            </>
          )}

          {/* GRANTED */}
          {choice === 'granted' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-80 h-60 rounded-xl object-cover
                           bg-muted border border-border"
              />
              <p className="text-[#16a34a] text-sm font-medium">Câmera ativada ✓</p>
              <button
                onClick={handleStart}
                className="w-full rounded-lg bg-foreground text-background
                           px-4 py-3 text-sm font-medium hover:opacity-90
                           transition-opacity"
              >
                Iniciar entrevista
              </button>
              <button
                onClick={handleCancelCamera}
                className="text-sm text-muted-fg hover:text-foreground transition-colors"
              >
                Continuar sem câmera
              </button>
            </>
          )}

          {/* DENIED */}
          {choice === 'denied' && (
            <>
              <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center">
                <CameraOff className="w-10 h-10 text-muted-fg" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-heading-sm text-foreground">
                  Câmera não disponível
                </h1>
                <p className="text-muted-fg text-sm leading-relaxed">
                  Tudo bem! A entrevista funciona normalmente sem câmera.
                </p>
              </div>
              <button
                onClick={handleDeniedStart}
                className="w-full rounded-lg bg-foreground text-background
                           px-4 py-3 text-sm font-medium hover:opacity-90
                           transition-opacity"
              >
                Iniciar entrevista
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
