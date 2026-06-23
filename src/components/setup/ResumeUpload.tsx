'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import {
  UploadCloud, CheckCircle, AlertCircle, Loader2,
  Upload, PenLine, ChevronRight, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { Candidate } from '@/lib/types';
import { useSessionStore } from '@/lib/store';

interface ManualFormData {
  nome: string;
  cargo: string;
  experiencia: string;
  habilidades: string;
}

interface Props {
  onComplete: (candidate: Candidate) => void;
  onWarning?: (msg: string) => void;
  initialManualData?: ManualFormData | null;
  onManualDataChange?: (data: ManualFormData) => void;
}

type Mode   = 'choose' | 'upload' | 'manual';
type Status = 'idle' | 'uploading' | 'success' | 'error';

export default function ResumeUpload({
  onComplete,
  onWarning,
  initialManualData,
  onManualDataChange,
}: Props) {
  const { session } = useSessionStore();

  // ── modo ──────────────────────────────────────────────────
  const [mode,          setMode]          = useState<Mode>('choose');
  const [skipMode,      setSkipMode]      = useState(false);
  const [mostrarUploader, setMostrarUploader] = useState(false);

  // ── upload ────────────────────────────────────────────────
  const [file,      setFile]      = useState<File | null>(null);
  const [status,    setStatus]    = useState<Status>('idle');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── manual ────────────────────────────────────────────────
  const [nome,        setNome]        = useState(initialManualData?.nome        ?? '');
  const [cargo,       setCargo]       = useState(initialManualData?.cargo       ?? '');
  const [experiencia, setExperiencia] = useState(initialManualData?.experiencia ?? '');
  const [habilidades, setHabilidades] = useState(initialManualData?.habilidades ?? '');

  // Mostrar banner de scanning se upload demorar > 3s
  useEffect(() => {
    if (status !== 'uploading') { setIsScanning(false); return; }
    const t = setTimeout(() => setIsScanning(true), 3000);
    return () => clearTimeout(t);
  }, [status]);

  // ── helpers manual form ───────────────────────────────────
  function updateNome(v: string) {
    setNome(v);
    onManualDataChange?.({ nome: v, cargo, experiencia, habilidades });
  }
  function updateCargo(v: string) {
    setCargo(v);
    onManualDataChange?.({ nome, cargo: v, experiencia, habilidades });
  }
  function updateExperiencia(v: string) {
    setExperiencia(v);
    onManualDataChange?.({ nome, cargo, experiencia: v, habilidades });
  }
  function updateHabilidades(v: string) {
    setHabilidades(v);
    onManualDataChange?.({ nome, cargo, experiencia, habilidades: v });
  }

  // ── helpers upload ────────────────────────────────────────
  function validate(f: File): string | null {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const byName = f.name.endsWith('.pdf') || f.name.endsWith('.docx');
    if (!allowed.includes(f.type) && !byName) return 'Formato inválido. Use PDF ou DOCX.';
    if (f.size > 5 * 1024 * 1024) return 'Arquivo muito grande. Máximo 5MB.';
    return null;
  }

  async function processFile(f: File) {
    const err = validate(f);
    if (err) { setErrorMsg(err); setStatus('error'); return; }
    setFile(f);
    setStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('sessionId', session.id);
      const res  = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const data = await res.json() as { candidate?: Candidate; isImagePdf?: boolean; warning?: string; error?: string };
      if (res.status === 429) {
        toast.error(data.error ?? 'Muitas requisições. Aguarde alguns minutos e tente novamente.');
        setStatus('idle');
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar currículo.');
      if (data.warning) onWarning?.(data.warning);
      if (data.isImagePdf) setIsScanning(false);
      setCandidate(data.candidate ?? null);
      setStatus('success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro inesperado.');
      setStatus('error');
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); }
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  // ── CARD: currículo já carregado ──────────────────────────
  const existingCandidate = session.candidate;

  if (mode === 'choose' && existingCandidate && !mostrarUploader) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-700
                      rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500
                         dark:text-zinc-400 uppercase tracking-widest mb-1">
              Currículo carregado
            </p>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              {existingCandidate.nome}
            </h3>
            {existingCandidate.cargo_atual && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {existingCandidate.cargo_atual}
              </p>
            )}
          </div>
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30
                          rounded-full flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round"
                 className="text-green-600 dark:text-green-400">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        {/* Experiências */}
        {existingCandidate.experiencias?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-zinc-500
                         dark:text-zinc-400 mb-2">
              {existingCandidate.experiencias.length} experiência(s) identificada(s)
            </p>
            <div className="space-y-1.5">
              {existingCandidate.experiencias.slice(0, 3).map((exp, i) => (
                <div key={i} className="text-sm text-zinc-700
                                        dark:text-zinc-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-zinc-400 rounded-full shrink-0" />
                  {exp.cargo}{exp.empresa ? ` — ${exp.empresa}` : ''}
                </div>
              ))}
              {existingCandidate.experiencias.length > 3 && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  +{existingCandidate.experiencias.length - 3} outras experiências
                </p>
              )}
            </div>
          </div>
        )}

        {/* Habilidades */}
        {existingCandidate.habilidades?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-zinc-500
                         dark:text-zinc-400 mb-2">
              Habilidades identificadas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {existingCandidate.habilidades.slice(0, 8).map((h, i) => (
                <span key={i}
                      className="text-xs bg-zinc-100 dark:bg-zinc-800
                                 text-zinc-600 dark:text-zinc-400
                                 px-2.5 py-1 rounded-full">
                  {h}
                </span>
              ))}
              {existingCandidate.habilidades.length > 8 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 px-2 py-1">
                  +{existingCandidate.habilidades.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Formação */}
        {existingCandidate.formacao?.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-zinc-500
                         dark:text-zinc-400 mb-2">
              Formação
            </p>
            {existingCandidate.formacao.slice(0, 2).map((f, i) => (
              <p key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                {f.curso}{f.instituicao ? ` — ${f.instituicao}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onComplete(existingCandidate)}
            className="flex-1 bg-zinc-900 dark:bg-white text-white
                       dark:text-zinc-900 py-3 rounded-full font-semibold
                       text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100
                       transition-colors"
          >
            Usar este currículo →
          </button>
          <button
            onClick={() => setMostrarUploader(true)}
            className="flex-1 border border-zinc-200 dark:border-zinc-700
                       text-zinc-600 dark:text-zinc-400 py-3 rounded-full
                       text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800
                       transition-colors"
          >
            Fazer upload de outro
          </button>
        </div>
      </div>
    );
  }

  // ── TELA INICIAL ──────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="space-y-3">
        {mostrarUploader && (
          <button
            onClick={() => setMostrarUploader(false)}
            className="flex items-center gap-1 text-sm text-zinc-500
                       hover:text-zinc-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao currículo atual
          </button>
        )}
        <p className="text-sm text-zinc-500 text-center mb-4">Como quer começar?</p>

        <button
          onClick={() => setMode('upload')}
          className="w-full flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-700
                     rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800
                     transition-all text-left"
        >
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <Upload className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white text-sm">Enviar meu currículo</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">PDF ou DOCX — entrevista mais personalizada</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 ml-auto" />
        </button>

        <button
          onClick={() => setMode('manual')}
          className="w-full flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-700
                     rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800
                     transition-all text-left"
        >
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <PenLine className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white text-sm">Preencher manualmente</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Responda 4 perguntas rápidas</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 ml-auto" />
        </button>

        <button
          onClick={() => { setSkipMode(true); setMode('manual'); }}
          className="w-full flex items-center gap-4 p-4 border border-dashed
                     border-zinc-200 rounded-xl hover:border-zinc-300
                     hover:bg-zinc-50 transition-all text-left"
        >
          <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <ArrowRight className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-500 text-sm">Pular esta etapa</p>
            <p className="text-xs text-zinc-500 mt-0.5">A entrevista será menos personalizada</p>
          </div>
        </button>
      </div>
    );
  }

  // ── MODO MANUAL ───────────────────────────────────────────
  if (mode === 'manual') {
    if (skipMode) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Tudo bem! Só precisamos do seu nome para personalizar a entrevista.
          </p>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Seu nome</label>
            <input
              value={nome}
              onChange={e => updateNome(e.target.value)}
              placeholder="Ex: João Silva"
              className="mt-1 w-full border border-zinc-200 rounded-lg px-3
                         py-2.5 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                         focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500
                         focus:ring-2 focus:ring-zinc-900/5 bg-white dark:bg-zinc-900
                         border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <button
            onClick={() => {
              if (!nome.trim()) return;
              const c: Candidate = {
                nome:          nome.trim(),
                cargo_atual:   '',
                experiencias:  [],
                habilidades:   [],
                formacao:      [],
                certificacoes: [],
              };
              onComplete(c);
            }}
            disabled={!nome.trim()}
            className="w-full bg-zinc-900 text-white py-3 rounded-xl
                       font-medium text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
          >
            Continuar →
          </button>

          <button
            onClick={() => { setSkipMode(false); setMode('choose'); }}
            className="w-full text-sm text-zinc-500 hover:text-zinc-700"
          >
            ← Voltar
          </button>
        </div>
      );
    }

    const canSubmit = nome.trim() && cargo.trim() && experiencia;
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode('choose')}
          className="flex items-center gap-1 text-sm text-zinc-500
                     hover:text-zinc-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Seu nome</label>
          <input
            value={nome}
            onChange={e => updateNome(e.target.value)}
            placeholder="Ex: João Silva"
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3
                       py-2.5 text-base text-zinc-900 placeholder:text-zinc-400
                       focus:outline-none focus:border-zinc-400
                       focus:ring-2 focus:ring-zinc-900/5 bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cargo atual ou área de atuação
          </label>
          <input
            value={cargo}
            onChange={e => updateCargo(e.target.value)}
            placeholder="Ex: Desenvolvedor Frontend, Analista de Marketing"
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3
                       py-2.5 text-base text-zinc-900 placeholder:text-zinc-400
                       focus:outline-none focus:border-zinc-400
                       focus:ring-2 focus:ring-zinc-900/5 bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Anos de experiência
          </label>
          <select
            value={experiencia}
            onChange={e => updateExperiencia(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3
                       py-2.5 text-base text-zinc-900 focus:outline-none
                       focus:border-zinc-400 focus:ring-2
                       focus:ring-zinc-900/5 bg-white"
          >
            <option value="">Selecione...</option>
            <option value="Menos de 1 ano">Menos de 1 ano</option>
            <option value="1 a 2 anos">1 a 2 anos</option>
            <option value="3 a 5 anos">3 a 5 anos</option>
            <option value="6 a 10 anos">6 a 10 anos</option>
            <option value="Mais de 10 anos">Mais de 10 anos</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Principais habilidades
          </label>
          <input
            value={habilidades}
            onChange={e => updateHabilidades(e.target.value)}
            placeholder="Ex: React, Node.js, liderança, vendas consultivas"
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3
                       py-2.5 text-base text-zinc-900 placeholder:text-zinc-400
                       focus:outline-none focus:border-zinc-400
                       focus:ring-2 focus:ring-zinc-900/5 bg-white"
          />
          <p className="text-xs text-zinc-500 mt-1">Separe por vírgula</p>
        </div>

        <button
          onClick={() => {
            if (!canSubmit) return;
            const c: Candidate = {
              nome: nome.trim(),
              cargo_atual: cargo.trim(),
              experiencias: [{
                cargo:    cargo.trim(),
                empresa:  'Empresa atual',
                periodo:  experiencia,
                descricao: '',
              }],
              habilidades:  habilidades.split(',').map(h => h.trim()).filter(Boolean),
              formacao:      [],
              certificacoes: [],
            };
            onComplete(c);
          }}
          disabled={!canSubmit}
          className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 rounded-xl font-medium
                     text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
        >
          Continuar →
        </button>
      </div>
    );
  }

  // ── MODO UPLOAD ───────────────────────────────────────────
  if (status === 'success' && candidate) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6
                      flex flex-col gap-4">
        <div className="flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">Currículo analisado com sucesso</span>
        </div>
        <div className="space-y-1">
          <p className="text-zinc-900 font-medium text-lg">
            {candidate.nome || '—'}
          </p>
          <p className="text-zinc-500 text-sm">
            {candidate.cargo_atual || 'Cargo não identificado'}
          </p>
          {candidate.habilidades.length > 0 && (
            <p className="text-zinc-500 text-xs mt-2">
              {candidate.habilidades.slice(0, 5).join(' · ')}
              {candidate.habilidades.length > 5 &&
                ` · +${candidate.habilidades.length - 5}`}
            </p>
          )}
        </div>
        <button
          onClick={() => onComplete(candidate)}
          className="mt-2 w-full bg-zinc-900 text-white px-4 py-2.5 text-sm
                     font-medium rounded-xl hover:bg-zinc-700 transition-colors"
        >
          Confirmar e continuar
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6
                      flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setStatus('idle');
              setFile(null);
              setErrorMsg('');
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="flex-1 rounded-md border border-zinc-200
                       hover:bg-zinc-50 px-4 py-2.5 text-sm font-medium
                       text-zinc-700 transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => {
              setStatus('idle');
              setFile(null);
              setErrorMsg('');
              setMode('choose');
            }}
            className="flex-1 rounded-md border border-zinc-200
                       hover:bg-zinc-50 px-4 py-2.5 text-sm font-medium
                       text-zinc-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setMode('choose')}
        className="flex items-center gap-1 text-sm text-zinc-500
                   hover:text-zinc-700"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => status === 'idle' && inputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-zinc-200
                   hover:border-zinc-400 transition-colors p-10 flex
                   flex-col items-center gap-3 text-center cursor-pointer
                   select-none dark:border-zinc-700 dark:hover:border-zinc-500"
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx"
               className="hidden" onChange={onChange} />
        {status === 'uploading' ? (
          <>
            <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
            <p className="text-sm text-zinc-500">Analisando currículo com IA...</p>
            {file && <p className="text-xs text-zinc-500">{file.name}</p>}
          </>
        ) : (
          <>
            <UploadCloud className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">Arraste seu currículo aqui</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">ou clique para selecionar</p>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">PDF ou DOCX · máx. 5MB</p>
          </>
        )}
      </div>

      {isScanning && (
        <div className="flex items-center gap-3 p-4
                        bg-amber-50 dark:bg-amber-900/20 rounded-xl
                        border border-amber-200 dark:border-amber-800">
          <div className="w-5 h-5 border-2 border-amber-500
                          border-t-transparent rounded-full animate-spin
                          shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700
                         dark:text-amber-400">
              PDF com imagem detectado
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              Fazendo análise visual do documento... isso pode levar alguns segundos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
