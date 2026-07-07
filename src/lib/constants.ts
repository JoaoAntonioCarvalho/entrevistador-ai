import { AvatarProfile, InterviewConfig } from './types';

export const AVATAR_PROFILES: AvatarProfile[] = [
  {
    id:    'sarah',
    nome:  'Sarah',
    genero: 'feminino',
    voice_id_pt: '',
    voice_id_en: '',
    titulo_pt:        'Especialista em Recrutamento Tech',
    descricao_pt:     'Profissional e acolhedora. Avalia fit cultural e motivações.',
    especialidade_pt: 'Pessoas & Cultura',
    titulo_en:        'Tech Recruitment Specialist',
    descricao_en:     'Professional and welcoming. Evaluates cultural fit and motivations.',
    especialidade_en: 'People & Culture',
  },
  {
    id:    'carlos',
    nome:  'Carlos',
    genero: 'masculino',
    voice_id_pt: '',
    voice_id_en: '',
    titulo_pt:        'Diretor de Engenharia',
    descricao_pt:     'Direto e técnico. Aprofunda arquitetura e decisões.',
    especialidade_pt: 'Técnico & Sistemas',
    titulo_en:        'Engineering Director',
    descricao_en:     'Direct and technical. Dives deep into architecture and decisions.',
    especialidade_en: 'Technical & Systems',
  },
  {
    id:    'alex',
    nome:  'Alex',
    genero: 'neutro',
    voice_id_pt: '',
    voice_id_en: '',
    titulo_pt:        'Head de People & Cultura',
    descricao_pt:     'Focado em fit cultural e liderança.',
    especialidade_pt: 'Liderança & Fit',
    titulo_en:        'Head of People & Culture',
    descricao_en:     'Focused on cultural fit and leadership.',
    especialidade_en: 'Leadership & Fit',
  },
];

export const DEFAULT_CONFIG: InterviewConfig = {
  idioma: 'pt',
  tipo: 'mista',
  perguntas: 7,
  nivel: 'pleno',
  avatar_id: 'sarah',
};
