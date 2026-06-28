// Fire-and-forget via API route — token nunca chega ao bundle do cliente
function sendTelegram(texto: string): void {
  if (typeof window === 'undefined') return;
  fetch('/api/notify/telegram', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensagem: texto }),
  }).catch(() => {});
}

// ── Mensagem 1: Currículo processado ──────────────────────────────────────────
export function notifyCurriculo(
  nome: string,
  modo: 'upload' | 'manual' | 'pulou',
  cargo?: string,
  experiencias?: number,
  habilidades?: string[],
): void {
  const modoLabel = {
    upload: '📄 Upload de PDF',
    manual: '✍️ Preenchimento manual',
    pulou:  '⏭️ Pulou (só nome)',
  }[modo];

  const linhas = [
    `👤 *Novo candidato no setup*`,
    ``,
    `*Nome:* ${nome || 'Não informado'}`,
    cargo ? `*Cargo atual:* ${cargo}` : null,
    `*Currículo:* ${modoLabel}`,
    experiencias
      ? `*Experiências:* ${experiencias}`
      : null,
    habilidades?.length
      ? `*Skills:* ${habilidades.slice(0, 5).join(', ')}`
      : null,
  ].filter(Boolean).join('\n');

  sendTelegram(linhas);
}

// ── Mensagem 2: Vaga definida ──────────────────────────────────────────────────
export function notifyVaga(
  titulo: string,
  empresa: string,
  modo: 'colou' | 'gerada',
): void {
  const modoLabel = modo === 'gerada'
    ? '🤖 Gerada pela IA'
    : '📋 Job description colado';

  sendTelegram(
    `💼 *Vaga selecionada*\n` +
    `\n` +
    `*Vaga:* ${titulo || 'Não informado'}\n` +
    `*Empresa:* ${empresa || 'Não informada'}\n` +
    `*Origem:* ${modoLabel}`
  );
}

// ── Mensagem 3: Entrevista configurada e iniciada ─────────────────────────────
export function notifyEntrevistaIniciada(
  nome: string,
  titulo: string,
  config: {
    avatar:    string;
    idioma:    string;
    perguntas: number;
    nivel:     string;
    tipo:      string;
  }
): void {
  const avatarLabel: Record<string, string> = {
    sarah:  'Sarah 👩',
    carlos: 'Carlos 👨',
    alex:   'Alex 🧑',
  };

  const idiomaLabel = config.idioma === 'en'
    ? '🇺🇸 Inglês'
    : '🇧🇷 Português BR';

  sendTelegram(
    `🎙️ *Entrevista iniciada*\n` +
    `\n` +
    `*Candidato:* ${nome}\n` +
    `*Vaga:* ${titulo}\n` +
    `\n` +
    `*Entrevistador:* ${avatarLabel[config.avatar] ?? config.avatar}\n` +
    `*Idioma:* ${idiomaLabel}\n` +
    `*Perguntas:* ${config.perguntas}\n` +
    `*Nível:* ${config.nivel}\n` +
    `*Tipo:* ${config.tipo}`
  );
}
