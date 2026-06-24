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
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
      <Header />
      <div className="flex items-center justify-center px-4 min-h-[calc(100vh-65px)]">
        <div className="w-full max-w-[480px] flex flex-col items-center gap-8 text-center">

          {/* PENDING */}
          {choice === 'pending' && (
            <>
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <Camera className="w-10 h-10 text-zinc-300 dark:text-zinc-500" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                  Deseja usar sua câmera?
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Ativar a câmera melhora a experiência e simula
                  uma entrevista mais realista.
                </p>
                {error && (
                  <p className="text-red-500 text-sm mt-1">{error}</p>
                )}
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleActivateCamera}
                  className="flex-1 rounded-full bg-zinc-900 dark:bg-white
                             text-white dark:text-zinc-900 px-4 py-3 text-sm
                             font-medium hover:bg-zinc-700 dark:hover:bg-zinc-100
                             transition-colors"
                >
                  Sim, ativar câmera
                </button>
                <button
                  onClick={handleSkip}
                  className="flex-1 rounded-full border border-zinc-200
                             dark:border-zinc-700 text-zinc-600 dark:text-zinc-300
                             px-4 py-3 text-sm font-medium
                             hover:bg-zinc-50 dark:hover:bg-zinc-800
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
                className="w-80 h-60 rounded-2xl object-cover
                           bg-zinc-100 dark:bg-zinc-800
                           border-2 border-zinc-200 dark:border-zinc-700"
              />
              <p className="text-emerald-600 text-sm font-medium">Câmera ativada ✓</p>
              <button
                onClick={handleStart}
                className="w-full rounded-full bg-zinc-900 dark:bg-white
                           text-white dark:text-zinc-900 px-4 py-3 text-sm
                           font-medium hover:bg-zinc-700 dark:hover:bg-zinc-100
                           transition-colors"
              >
                Iniciar entrevista
              </button>
              <button
                onClick={handleCancelCamera}
                className="text-sm text-zinc-400 dark:text-zinc-500
                           hover:text-zinc-600 dark:hover:text-zinc-300
                           transition-colors"
              >
                Continuar sem câmera
              </button>
            </>
          )}

          {/* DENIED */}
          {choice === 'denied' && (
            <>
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <CameraOff className="w-10 h-10 text-zinc-300 dark:text-zinc-500" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                  Câmera não disponível
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Tudo bem! A entrevista funciona normalmente sem câmera.
                </p>
              </div>
              <button
                onClick={handleDeniedStart}
                className="w-full rounded-full bg-zinc-900 dark:bg-white
                           text-white dark:text-zinc-900 px-4 py-3 text-sm
                           font-medium hover:bg-zinc-700 dark:hover:bg-zinc-100
                           transition-colors"
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
