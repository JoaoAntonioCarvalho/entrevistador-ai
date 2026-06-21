'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, X } from 'lucide-react';

interface Props {
  candidateName: string;
}

type Permission = 'unknown' | 'granted' | 'denied';

export default function CameraWidget({ candidateName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<Permission>('unknown');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Connect stream to video element when both are available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Stop tracks when stream changes (cleanup previous stream)
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  // Auto-open if user enabled camera in camera-check
  useEffect(() => {
    const cameraEnabled = sessionStorage.getItem('camera-enabled') === 'true';
    if (!cameraEnabled) return;

    setIsOpen(true);
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(s => {
        setStream(s);
        setHasPermission('granted');
      })
      .catch(() => {
        setHasPermission('denied');
        setIsOpen(false);
      });
  // Run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen() {
    setIsOpen(true);
    // If already denied, just show the denied UI — don't call getUserMedia again
    if (hasPermission === 'denied') return;
    // If already have a stream, nothing to do
    if (stream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s);
      setHasPermission('granted');
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setHasPermission('denied');
        setIsOpen(false);
      }
    }
  }

  function handleClose() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setIsOpen(false);
  }

  const initial = (candidateName.charAt(0) || '?').toUpperCase();

  // ── CLOSED ──────────────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <div
        className="fixed bottom-36 md:bottom-24 right-4 z-50 cursor-pointer group"
        onClick={handleOpen}
        title="Abrir câmera"
      >
        <div className="relative w-14 h-14">
          <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center group-hover:border-zinc-400 transition-colors">
            <span className="text-zinc-300 font-semibold text-lg select-none">
              {initial}
            </span>
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center border border-zinc-600">
            <Camera className="w-3 h-3 text-zinc-300" />
          </div>
        </div>
      </div>
    );
  }

  // ── OPEN — DENIED ────────────────────────────────────────────────────────────
  if (hasPermission === 'denied') {
    return (
      <div className="fixed bottom-36 md:bottom-24 right-4 z-50">
        <div className="relative w-40 h-20 bg-zinc-800 rounded-xl border-2 border-zinc-600 flex flex-col items-center justify-center gap-1">
          <CameraOff className="w-5 h-5 text-zinc-400" />
          <span className="text-xs text-zinc-400">Permissão negada</span>
          <button
            onClick={handleClose}
            className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    );
  }

  // ── OPEN — GRANTED ───────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-36 md:bottom-24 right-4 z-50">
      <div className="relative w-40 h-[120px] rounded-xl overflow-hidden border-2 border-zinc-600">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
