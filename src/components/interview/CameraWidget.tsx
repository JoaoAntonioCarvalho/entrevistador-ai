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
  const [isMobile, setIsMobile] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // ── Drag com snap (mobile E desktop) ────────────────────────────────────
  const [lado, setLado] = useState<'direita' | 'esquerda'>('direita');
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX:    number;
    startY:    number;
    rect:      DOMRect;
    moved:     boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const snapAnimRef      = useRef(false);
  const snapTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => () => {
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
  }, []);

  // Hint "Arraste para mover": uma única vez por sessão, some sozinho em 4s
  useEffect(() => {
    if (sessionStorage.getItem('camera-drag-hint') === 'true') return;
    sessionStorage.setItem('camera-drag-hint', 'true');
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (snapAnimRef.current) return;
    const el = wrapRef.current;
    if (!el) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return; // não inicia drag em botões internos
    // CAPTURA IMEDIATA — não esperar detectar movimento. Capturar só depois
    // (na versão anterior) criava uma corrida contra o navegador: no toque
    // touch, o gesto podia ser "roubado" antes do threshold de 8px ser
    // atingido, e o widget parecia travado (pointermove parava de chegar).
    // Capturando no down, garantimos receber TODOS os eventos do ponteiro
    // deste gesto, independente de para onde ele se mover.
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX:    e.clientX,
      startY:    e.clientY,
      rect:      el.getBoundingClientRect(),
      moved:     false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d  = dragRef.current;
    const el = wrapRef.current;
    if (!d || !el || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      // < 8px continua sendo tratado como clique, não arraste — mas o
      // ponteiro já está capturado desde o down, então não há risco de
      // perder eventos entre aqui e o momento em que moved vira true
      if (Math.hypot(dx, dy) < 8) return;
      d.moved = true;
      setDragging(true);
    }
    // Clamp aos limites da viewport — o widget nunca sai da tela
    const margem = 8;
    const left = Math.min(
      Math.max(d.rect.left + dx, margem),
      window.innerWidth - d.rect.width - margem
    );
    const top = Math.min(
      Math.max(d.rect.top + dy, margem),
      window.innerHeight - d.rect.height - margem
    );
    // Sem transição durante o arraste — só no snap
    el.style.transform = `translate3d(${left - d.rect.left}px, ${top - d.rect.top}px, 0)`;
  }

  function onPointerEnd(e: React.PointerEvent) {
    const d  = dragRef.current;
    const el = wrapRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    if (!d.moved || !el) return; // clique normal — deixa o onClick seguir

    suppressClickRef.current = true;
    setDragging(false);

    // Snap: canto inferior mais próximo do centro do widget; vertical sempre
    // volta ao bottom fixo (acima do footer do microfone no mobile, ou
    // posição padrão no desktop). Cantos superiores nunca são usados.
    const margem = 8;
    const left = Math.min(
      Math.max(d.rect.left + (e.clientX - d.startX), margem),
      window.innerWidth - d.rect.width - margem
    );
    const centroX  = left + d.rect.width / 2;
    const novoLado: 'direita' | 'esquerda' =
      centroX < window.innerWidth / 2 ? 'esquerda' : 'direita';
    const targetLeft =
      novoLado === 'esquerda' ? 12 : window.innerWidth - d.rect.width - 12;

    snapAnimRef.current = true;
    el.style.transition = 'transform 250ms ease-out';
    el.style.transform  = `translate3d(${targetLeft - d.rect.left}px, 0, 0)`;
    snapTimeoutRef.current = setTimeout(() => {
      const wrap = wrapRef.current;
      if (wrap) {
        wrap.style.transition = '';
        wrap.style.transform  = '';
      }
      setLado(novoLado);
      snapAnimRef.current = false;
    }, 260);
  }

  // touch-none — sem isso o iOS rola a página junto com o drag.
  // Agora sem gate de isMobile: drag + snap funcionam em ambos os ambientes.
  const wrapClass = `fixed z-50 touch-none select-none ${
    isMobile
      ? `bottom-36 ${lado === 'direita' ? 'right-3' : 'left-3'}`
      : `bottom-24 ${lado === 'direita' ? 'right-4' : 'left-4'}`
  } ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`;

  const dragProps = {
    ref:             wrapRef,
    onPointerDown,
    onPointerMove,
    onPointerUp:     onPointerEnd,
    onPointerCancel: onPointerEnd,
    onClickCapture: (e: React.MouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };

  const hint = showHint ? (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
      Arraste para mover
    </div>
  ) : null;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen() {
    setIsOpen(true);
    if (hasPermission === 'denied') return;
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

  if (!isOpen) {
    return (
      <div
        {...dragProps}
        className={`${wrapClass} group`}
        onClick={handleOpen}
        title="Abrir câmera"
      >
        {hint}
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

  if (hasPermission === 'denied') {
    return (
      <div {...dragProps} className={wrapClass}>
        {hint}
        <div className="relative w-40 h-20 bg-zinc-800 rounded-xl border-2 border-zinc-600 flex flex-col items-center justify-center gap-1">
          <CameraOff className="w-5 h-5 text-zinc-400" />
          <span className="text-xs text-zinc-400">Permissão negada</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div {...dragProps} className={wrapClass}>
      {hint}
      <div className="relative w-28 md:w-[clamp(140px,13vw,260px)] aspect-[4/3] rounded-xl overflow-hidden border-2 border-zinc-600">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
