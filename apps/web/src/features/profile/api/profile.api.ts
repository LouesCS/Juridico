import { apiClient } from '@/lib/api/client';

/**
 * Reafirma docs/frontend/02-estrutura-pastas.md §2.1 —
 * `profile/ ↔ backend Users (mock) + Identity (real, sessões/senha)`.
 * `changePassword`/`listSessions`/`revokeSession` são endpoints reais de
 * Identity (`apps/api/src/modules/identity/`); não existe nenhum endpoint
 * real de edição de perfil (nome/foto/telefone/idioma/tema) — ver
 * docs/frontend-implementation/19-decisions.md.
 */
export interface SessionDTO {
  id: string;
  dispositivo: string | null;
  ip: string | null;
  ultimoUsoEm: string;
  criadaEm: string;
  atual: boolean;
}

export interface ChangePasswordInput {
  senhaAtual: string;
  novaSenha: string;
}

export const profileApi = {
  changePassword: (input: ChangePasswordInput) => apiClient.post<void>('/me/password', input),
  listSessions: () => apiClient.get<SessionDTO[]>('/auth/sessions'),
  revokeSession: (sessionId: string) => apiClient.delete<void>(`/auth/sessions/${sessionId}`),
};
