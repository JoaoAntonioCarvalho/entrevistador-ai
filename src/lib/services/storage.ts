import { InterviewSession } from '../types';

const STORAGE_KEY = 'mockai-sessions';

function getAllSessions(): InterviewSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InterviewSession[];
  } catch {
    return [];
  }
}

export async function saveSession(session: InterviewSession): Promise<void> {
  // TODO: Supabase → supabase.from('sessions').upsert(session)
  const sessions = getAllSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export async function getSession(id: string): Promise<InterviewSession | null> {
  // TODO: Supabase → supabase.from('sessions').select('*').eq('id', id).single()
  const sessions = getAllSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function listSessions(): Promise<InterviewSession[]> {
  // TODO: Supabase → supabase.from('sessions').select('*').order('created_at', { ascending: false })
  const sessions = getAllSessions();
  return sessions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
