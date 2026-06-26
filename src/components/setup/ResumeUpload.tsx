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
  onComplete: (candidate: Candidate, mode: 'upload' | 'manual' | 'pulou') => void;
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

  const [mode,          setMode]          = useState<Mode>('choose');
  const [skipMode,      setSkipMode]      = useState(false);
  const [mostrarUploader, setMostrarUploader] = useState(false);

  const [file,      setFile]      = useState<File | null>(null);
  const [status,    setStatus]    = useState<Status>('idle');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [nome,        setNome]        = useState(initialManualData?.nome        ?? '');
  const [cargo,       setCargo]       = useState(initialManualData?.cargo       ?? '');
  const [experiencia, setExperiencia] = useState(initialManualData?.experiencia ?? '');
  const [habilidades, setHabilidades] = useState(initialManualData?.habilidades ?? '');

  useEffect(() => {
    if (status !== 'uploading') { setIsScanning(false); return; }
    const t = setTimeout(() => setIsScanning(true), 3000);
    return () => clearTimeout(t);
  }, [status]);

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
      if (res.status === 422) {
        toast.error(
          data.error ?? 'Não conseguimos ler este PDF automaticamente. Tente "Preencher manualmente" para continuar.',
          { duration: 6000 }
        );
        setStatus('idle');
        setFile(null);
        setMode('manual');
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

  const existingCandidate = session.candidate;

  if (mode === 'choose' && existingCandidate && !mostrarUploader) {
    return (
      <div className="border border-border rounded-xl p-6 bg-card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold text-muted-fg
                         uppercase tracking-eyebrow mb-1">
              Currículo carregado
            </p>
            <h3 className="text-xl font-bold text-foreground">
              {existingCandidate.nome}
            </h3>
            {existingCandidate.cargo_atual && (
              <p className="text-sm text-muted-fg mt-0.5">
                {existingCandidate.cargo_atual}
              </p>
            )}
          </div>
          <div className="w-10 h-10 bg-green-50 dark:bg-green-950/40 rounded-lg
                          flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400" aria-hidden="true" />
          </div>
        </div>

        {existingCandidate.experiencias?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-fg mb-2">
              {existingCandidate.experiencias.length} experiência(s) identificada(s)
            </p>
            <div className="space-y-1.5">
              {existingCandidate.experiencias.slice(0, 3).map((exp, i) => (
                <div key={i} className="text-sm text-foreground flex items-center gap-2">
                  <div className="w-1 h-1 bg-border-strong rounded-full shrink-0" />
                  {exp.cargo}{exp.empresa ? ` — ${exp.empresa}` : ''}
                </div>
              ))}
              {existingCandidate.experiencias.length > 3 && (
                <p className="text-xs text-muted-fg">
                  +{existingCandidate.experiencias.length - 3} outras experiências
                </p>
              )}
            </div>
          </div>
        )}

        {existingCandidate.habilidades?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-fg mb-2">
              Habilidades identificadas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {existingCandidate.habilidades.slice(0, 8).map((h, i) => (
                <span key={i}
                      className="text-xs bg-muted text-muted-fg
                                 px-2.5 py-1 rounded-full">
                  {h}
                </span>
              ))}
              {existingCandidate.habilidades.length > 8 && (
                <span className="text-xs text-muted-fg px-2 py-1">
                  +{existingCandidate.habilidades.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {existingCandidate.formacao?.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-fg mb-2">Formação</p>
            {existingCandidate.formacao.slice(0, 2).map((f, i) => (
              <p key={i} className="text-sm text-foreground">
                {f.curso}{f.instituicao ? ` — ${f.instituicao}` : ''}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onComplete(existingCandidate, 'upload')}
            className="flex-1 bg-foreground text-background py-3 rounded-lg font-semibold
                       text-sm hover:opacity-90 transition-opacity"
          >
            Usar este currículo →
          </button>
          <button
            onClick={() => setMostrarUploader(true)}
            className="flex-1 border border-border text-foreground py-3 rounded-lg
                       text-sm hover:bg-muted transition-colors"
          >
            Fazer upload de outro
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'choose') {
    return (
      <div className="space-y-3">
        {mostrarUploader && (
          <button
            onClick={() => setMostrarUploader(false)}
            className="flex items-center gap-1 text-sm text-muted-fg
                       hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao currículo atual
          </button>
        )}
        <p className="text-sm text-muted-fg text-center mb-4">Como quer começar?</p>

        <button
          onClick={() => setMode('upload')}
          className="w-full flex items-center gap-4 p-4 border border-border
                     rounded-xl hover:border-border-strong hover:bg-muted
                     transition-all text-left"
        >
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <Upload className="w-5 h-5 text-muted-fg" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Enviar meu currículo</p>
            <p className="text-xs text-muted-fg mt-0.5">PDF ou DOCX — entrevista mais personalizada</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-fg ml-auto" />
        </button>

        <button
          onClick={() => setMode('manual')}
          className="w-full flex items-center gap-4 p-4 border border-border
                     rounded-xl hover:border-border-strong hover:bg-muted
                     transition-all text-left"
        >
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <PenLine className="w-5 h-5 text-muted-fg" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Preencher manualmente</p>
            <p className="text-xs text-muted-fg mt-0.5">Responda 4 perguntas rápidas</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-fg ml-auto" />
        </button>

        <button
          onClick={() => { setSkipMode(true); setMode('manual'); }}
          className="w-full flex items-center gap-4 p-4 border border-dashed
                     border-border rounded-xl hover:border-border-strong
                     hover:bg-muted transition-all text-left"
        >
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <ArrowRight className="w-5 h-5 text-muted-fg" />
          </div>
          <div>
            <p className="font-medium text-muted-fg text-sm">Pular esta etapa</p>
            <p className="text-xs text-muted-fg mt-0.5">A entrevista será menos personalizada</p>
          </div>
        </button>
      </div>
    );
  }

  if (mode === 'manual') {
    if (skipMode) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-fg">
            Tudo bem! Só precisamos do seu nome para personalizar a entrevista.
          </p>

          <div>
            <label className="text-sm font-medium text-foreground">Seu nome</label>
            <input
              value={nome}
              onChange={e => updateNome(e.target.value)}
              placeholder="Ex: João Silva"
              className="mt-1 w-full border border-border rounded-lg px-3
                         py-2.5 text-base text-foreground placeholder:text-muted-fg
                         focus:outline-none focus:border-border-strong
                         focus:ring-2 focus:ring-foreground/5 bg-card"
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
              onComplete(c, 'pulou');
            }}
            disabled={!nome.trim()}
            className="w-full bg-foreground text-background py-3 rounded-lg
                       font-medium text-sm hover:opacity-90
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-opacity"
          >
            Continuar →
          </button>

          <button
            onClick={() => { setSkipMode(false); setMode('choose'); }}
            className="w-full text-sm text-muted-fg hover:text-foreground transition-colors"
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
          className="flex items-center gap-1 text-sm text-muted-fg
                     hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div>
          <label className="text-sm font-medium text-foreground">Seu nome</label>
          <input
            value={nome}
            onChange={e => updateNome(e.target.value)}
            placeholder="Ex: João Silva"
            className="mt-1 w-full border border-border rounded-lg px-3
                       py-2.5 text-base text-foreground placeholder:text-muted-fg
                       focus:outline-none focus:border-border-strong
                       focus:ring-2 focus:ring-foreground/5 bg-card"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">
            Cargo atual ou área de atuação
          </label>
          <input
            value={cargo}
            onChange={e => updateCargo(e.target.value)}
            placeholder="Ex: Desenvolvedor Frontend, Analista de Marketing"
            className="mt-1 w-full border border-border rounded-lg px-3
                       py-2.5 text-base text-foreground placeholder:text-muted-fg
                       focus:outline-none focus:border-border-strong
                       focus:ring-2 focus:ring-foreground/5 bg-card"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">
            Anos de experiência
          </label>
          <select
            value={experiencia}
            onChange={e => updateExperiencia(e.target.value)}
            className="mt-1 w-full border border-border rounded-lg px-3
                       py-2.5 text-base text-foreground focus:outline-none
                       focus:border-border-strong focus:ring-2
                       focus:ring-foreground/5 bg-card"
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
          <label className="text-sm font-medium text-foreground">
            Principais habilidades
          </label>
          <input
            value={habilidades}
            onChange={e => updateHabilidades(e.target.value)}
            placeholder="Ex: React, Node.js, liderança, vendas consultivas"
            className="mt-1 w-full border border-border rounded-lg px-3
                       py-2.5 text-base text-foreground placeholder:text-muted-fg
                       focus:outline-none focus:border-border-strong
                       focus:ring-2 focus:ring-foreground/5 bg-card"
          />
          <p className="text-xs text-muted-fg mt-1">Separe por vírgula</p>
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
            onComplete(c, 'manual');
          }}
          disabled={!canSubmit}
          className="w-full bg-foreground text-background py-3 rounded-lg font-medium
                     text-sm hover:opacity-90 disabled:opacity-40
                     disabled:cursor-not-allowed transition-opacity"
        >
          Continuar →
        </button>
      </div>
    );
  }

  if (status === 'success' && candidate) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-900/60
                      bg-green-50 dark:bg-green-950/30 p-6
                      flex flex-col gap-4">
        <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">Currículo analisado com sucesso</span>
        </div>
        <div className="space-y-1">
          <p className="text-foreground font-medium text-lg">
            {candidate.nome || '—'}
          </p>
          <p className="text-muted-fg text-sm">
            {candidate.cargo_atual || 'Cargo não identificado'}
          </p>
          {candidate.habilidades.length > 0 && (
            <p className="text-muted-fg text-xs mt-2">
              {candidate.habilidades.slice(0, 5).join(' · ')}
              {candidate.habilidades.length > 5 &&
                ` · +${candidate.habilidades.length - 5}`}
            </p>
          )}
        </div>
        <button
          onClick={() => onComplete(candidate, 'upload')}
          className="mt-2 w-full bg-foreground text-background px-4 py-2.5 text-sm
                     font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Confirmar e continuar
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/60
                      bg-red-50 dark:bg-red-950/30 p-6
                      flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
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
            className="flex-1 rounded-lg border border-border
                       hover:bg-muted px-4 py-2.5 text-sm font-medium
                       text-foreground transition-colors"
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
            className="flex-1 rounded-lg border border-border
                       hover:bg-muted px-4 py-2.5 text-sm font-medium
                       text-foreground transition-colors"
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
        className="flex items-center gap-1 text-sm text-muted-fg
                   hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => status === 'idle' && inputRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-border
                   hover:border-border-strong transition-colors p-10 flex
                   flex-col items-center gap-3 text-center cursor-pointer
                   select-none"
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx"
               className="hidden" onChange={onChange} />
        {status === 'uploading' ? (
          <>
            <Loader2 className="w-10 h-10 text-foreground animate-spin" />
            <p className="text-sm text-muted-fg">Analisando currículo com IA...</p>
            {file && <p className="text-xs text-muted-fg">{file.name}</p>}
          </>
        ) : (
          <>
            <UploadCloud className="w-10 h-10 text-muted-fg" />
            <div>
              <p className="font-medium text-foreground">Arraste seu currículo aqui</p>
              <p className="text-sm text-muted-fg mt-1">ou clique para selecionar</p>
            </div>
            <p className="text-xs text-muted-fg">PDF ou DOCX · máx. 5MB</p>
          </>
        )}
      </div>

      {isScanning && (
        <div className="flex items-center gap-3 p-4
                        bg-amber-50 dark:bg-amber-950/30 rounded-xl
                        border border-amber-200 dark:border-amber-800/60">
          <div className="w-5 h-5 border-2 border-amber-500 dark:border-amber-400
                          border-t-transparent rounded-full animate-spin
                          shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              PDF com imagem detectado
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Fazendo análise visual do documento... isso pode levar alguns segundos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
