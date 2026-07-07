export interface Candidate {
  nome: string;
  cargo_atual: string;
  experiencias: Array<{
    cargo: string;
    empresa: string;
    periodo: string;
    descricao: string;
  }>;
  habilidades: string[];
  formacao: Array<{
    curso: string;
    instituicao: string;
    periodo: string;
  }>;
  certificacoes: string[];
}

export interface Job {
  titulo: string;
  empresa: string;
  requisitos_obrigatorios: string[];
  requisitos_desejaveis: string[];
  responsabilidades: string[];
  stack_tecnica: string[];
  descricao_completa: string;
}

// ── Normalizadores ────────────────────────────────────────────
// Modelos de IA às vezes omitem campos ou retornam tipos errados. Estes
// normalizadores garantem que Candidate/Job sempre tenham a forma esperada
// (arrays presentes, strings presentes), evitando TypeError em quem consome
// esses dados depois — ex.: buildSystemPrompt acessa job.stack_tecnica.join().

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function normalizeCandidate(raw: unknown): Candidate {
  const c = (raw ?? {}) as Record<string, unknown>;
  const experiencias = Array.isArray(c.experiencias)
    ? (c.experiencias as unknown[]).map((e) => {
        const x = (e ?? {}) as Record<string, unknown>;
        return {
          cargo:     asString(x.cargo),
          empresa:   asString(x.empresa),
          periodo:   asString(x.periodo),
          descricao: asString(x.descricao),
        };
      })
    : [];
  const formacao = Array.isArray(c.formacao)
    ? (c.formacao as unknown[]).map((f) => {
        const x = (f ?? {}) as Record<string, unknown>;
        return {
          curso:       asString(x.curso),
          instituicao: asString(x.instituicao),
          periodo:     asString(x.periodo),
        };
      })
    : [];
  return {
    nome:          asString(c.nome) || 'Candidato',
    cargo_atual:   asString(c.cargo_atual),
    experiencias,
    habilidades:   asStringArray(c.habilidades),
    formacao,
    certificacoes: asStringArray(c.certificacoes),
  };
}

export function normalizeJob(raw: unknown): Job {
  const j = (raw ?? {}) as Record<string, unknown>;
  return {
    titulo:                  asString(j.titulo) || 'Vaga',
    empresa:                 asString(j.empresa),
    requisitos_obrigatorios: asStringArray(j.requisitos_obrigatorios),
    requisitos_desejaveis:   asStringArray(j.requisitos_desejaveis),
    responsabilidades:       asStringArray(j.responsabilidades),
    stack_tecnica:           asStringArray(j.stack_tecnica),
    descricao_completa:      asString(j.descricao_completa),
  };
}

export interface InterviewConfig {
  idioma: 'pt' | 'en';
  tipo: 'comportamental' | 'tecnica' | 'mista';
  perguntas: 7 | 14;
  nivel: 'junior' | 'pleno' | 'senior';
  avatar_id: 'sarah' | 'carlos' | 'alex';
}

export interface ConversationTurn {
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
}

export interface TurnEvaluation {
  pergunta: string;
  resposta: string;
  nota: number;
  positivo: string;
  melhoria: string;
  resposta_ideal: string;
}

export interface SessionScores {
  geral: number;
  clareza: number;
  relevancia: number;
  profundidade: number;
}

export interface CompetencyScores {
  comunicacao: number;
  resolucao_problemas: number;
  conhecimento_tecnico: number;
  lideranca: number;
  adaptabilidade: number;
}

export interface InterviewSession {
  id: string;
  created_at: string;
  status: 'setup' | 'active' | 'feedback' | 'completed' | 'discarded';
  candidate: Candidate | null;
  job: Job | null;
  config: InterviewConfig;
  conversation: ConversationTurn[];
  evaluations: TurnEvaluation[];
  scores: SessionScores | null;
  competencias: CompetencyScores | null;
  feedback_script: string | null;
  custo_total_usd?: number;
  custo_ia_usd?: number;
  custo_tts_usd?: number;
  avatar_profiles?: AvatarProfile[];
  paymentStatus?: 'pending' | 'paid';
}

export interface AvatarProfile {
  id:            'sarah' | 'carlos' | 'alex';
  nome:          string;
  genero:        'feminino' | 'masculino' | 'neutro';
  voice_id_pt:   string;
  voice_id_en:   string;

  titulo_pt:        string;
  descricao_pt:     string;
  especialidade_pt: string;

  titulo_en:        string;
  descricao_en:     string;
  especialidade_en: string;

  titulo?:        string;
  descricao?:     string;
  especialidade?: string;
}

export function resolveAvatarProfile(
  profile: AvatarProfile,
  idioma: 'pt' | 'en'
): AvatarProfile {
  return {
    ...profile,
    titulo:        idioma === 'en' ? profile.titulo_en        : profile.titulo_pt,
    descricao:     idioma === 'en' ? profile.descricao_en     : profile.descricao_pt,
    especialidade: idioma === 'en' ? profile.especialidade_en : profile.especialidade_pt,
  };
}

export interface InterviewTurnResponse {
  fala: string;
  avaliacao: {
    nota: number;
    positivo: string;
    melhoria: string;
    resposta_ideal: string;
  };
}
