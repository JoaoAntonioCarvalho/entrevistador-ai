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

export interface InterviewConfig {
  idioma: 'pt' | 'en';
  tipo: 'comportamental' | 'tecnica' | 'mista';
  perguntas: 7 | 10 | 15 | 20;
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
  status: 'setup' | 'active' | 'feedback' | 'completed';
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
}

export interface AvatarProfile {
  id:            'sarah' | 'carlos' | 'alex';
  nome:          string;
  genero:        'feminino' | 'masculino' | 'neutro';
  imagem:        string;
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
