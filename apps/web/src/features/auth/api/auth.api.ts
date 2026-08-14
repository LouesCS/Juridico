import { apiClient } from '@/lib/api/client';
import type { LoginFormValues, RegisterFormValues } from '../schemas/auth.schemas';

/**
 * Tipos manuais nesta rodada — o pipeline de geração via
 * `openapi-typescript` (docs/frontend/09-openapi.md) depende de um
 * `openapi.json` servido pelo backend real, que exige Postgres para
 * subir (não disponível neste ambiente). Pendência registrada em
 * docs/frontend-implementation/19-decisions.md. Estes tipos espelham,
 * campo a campo, os DTOs reais em
 * apps/api/src/modules/identity/application/use-cases/*.ts.
 */

/**
 * Espelha campo a campo o retorno real de
 * apps/api/src/modules/identity/application/use-cases/get-current-user.use-case.ts
 * — corrigido nesta rodada (a versão anterior era um formato plano
 * inventado, nunca validado contra o use case real; ver
 * docs/frontend-implementation/19-decisions.md §19.7).
 */
export interface CurrentUserDTO {
  usuario: {
    id: string;
    nome: string;
    sobrenome: string | null;
    email: string;
    avatarUrl: string | null;
    tema: string | null;
    idioma: string | null;
  };
  membro: {
    id: string | undefined;
    papel: string | undefined;
    permissions: string[];
  };
  escritorio: {
    id: string | undefined;
    nome: string | undefined;
    slug: string | undefined;
  };
}

export interface LoginResponseDTO {
  usuario: { id: string; nome: string; email: string };
  escritorios: Array<{ id: string; nome: string; papel: string }>;
  escritorioAtivoId: string;
}

export interface RegisterResponseDTO {
  usuario: { id: string; nome: string; email: string };
  escritorio: { id: string; slug: string; nomeFantasia: string };
}

export const authApi = {
  register: (input: RegisterFormValues) =>
    apiClient.post<RegisterResponseDTO>('/auth/register', input),

  login: (input: LoginFormValues) => apiClient.post<LoginResponseDTO>('/auth/login', input),

  logout: () => apiClient.post<void>('/auth/logout'),

  me: () => apiClient.get<CurrentUserDTO>('/me'),

  requestPasswordRecovery: (email: string) =>
    apiClient.post<{ ok: true }>('/auth/password-recovery', { email }),

  resetPassword: (input: { token: string; novaSenha: string }) =>
    apiClient.post<void>('/auth/password-reset', input),
};
