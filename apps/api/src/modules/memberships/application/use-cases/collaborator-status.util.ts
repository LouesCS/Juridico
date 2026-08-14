/**
 * "Situação de acesso" do colaborador — NÃO é um novo enum de banco (o
 * módulo Colaboradores reaproveita deliberadamente `StatusMembro` e
 * `StatusUsuario` já existentes), é um valor DERIVADO/computado na leitura,
 * combinando três fontes: `Membro.status`, `Membro.usuarioId` (presença) e
 * `Usuario.status`, mais a existência de um `Convite` pendente para este
 * `membroId`. Compartilhado por `GetCollaboratorUseCase` e
 * `ListCollaboratorsUseCase` para nunca haver duas implementações
 * divergentes da mesma regra.
 */
export type SituacaoAcesso =
  'sem_acesso' | 'convite_pendente' | 'bloqueado' | 'suspenso' | 'desbloqueado' | 'inativo';

export interface MembroParaSituacaoAcesso {
  status: string;
  usuarioId: string | null;
  usuario?: { status: string } | null;
}

export function computeSituacaoAcesso(
  membro: MembroParaSituacaoAcesso,
  temConvitePendente: boolean,
): SituacaoAcesso {
  // `INATIVO`/`SUSPENSO` são estados do PRÓPRIO colaborador (`Membro`) e
  // têm prioridade sobre qualquer estado da conta de acesso (`Usuario`) —
  // um colaborador inativo/suspenso é assim independente de ter ou não
  // login, e independente do status da conta vinculada.
  if (membro.status === 'INATIVO') return 'inativo';
  if (membro.status === 'SUSPENSO') return 'suspenso';

  if (!membro.usuarioId) {
    return temConvitePendente ? 'convite_pendente' : 'sem_acesso';
  }

  if (membro.usuario?.status === 'BLOQUEADO') return 'bloqueado';
  return 'desbloqueado';
}
