import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando, campo a campo, os use cases reais de
 * `apps/api/src/modules/memberships/application/use-cases/*.ts` — mesma
 * pendência de geração via `openapi-typescript` já registrada em
 * docs/frontend-implementation/19-decisions.md §19.2.
 */
export interface MemberDTO {
  id: string;
  usuario: { nome: string; email: string; avatarUrl: string | null };
  papel: string;
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
  entrouEm: string;
}

export interface InvitationDTO {
  id: string;
  email: string;
  status: 'PENDENTE' | 'ACEITO' | 'EXPIRADO' | 'REVOGADO';
  expiraEm: string;
  criadoEm: string;
  papelId: string;
}

export interface RoleDTO {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: number;
  ehSistema: boolean;
}

export interface InviteMemberInput {
  email: string;
  papelId: string;
}

export interface AcceptInvitationInput {
  nome?: string;
  sobrenome?: string;
  senha?: string;
}

export const teamApi = {
  listMembers: () => apiClient.get<MemberDTO[]>('/members'),

  updateMemberRole: (memberId: string, papelId: string) =>
    apiClient.patch<void>(`/members/${memberId}/role`, { papelId }),

  removeMember: (memberId: string) =>
    apiClient.delete<{ desativado: true }>(`/members/${memberId}`),

  inviteMember: (input: InviteMemberInput) =>
    apiClient.post<{ id: string; email: string; status: string; expiraEm: string }>(
      '/invitations',
      input,
    ),

  listInvitations: () => apiClient.get<InvitationDTO[]>('/invitations'),

  resendInvitation: (invitationId: string) =>
    apiClient.post<void>(`/invitations/${invitationId}/resend`),

  revokeInvitation: (invitationId: string) => apiClient.delete<void>(`/invitations/${invitationId}`),

  acceptInvitation: (token: string, input: AcceptInvitationInput) =>
    apiClient.post<{ membroId: string }>(`/invitations/${token}/accept`, input),

  listRoles: () => apiClient.get<RoleDTO[]>('/roles'),
};
