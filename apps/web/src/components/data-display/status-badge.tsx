import { Badge, type BadgeProps } from '@/components/ui/badge';

/**
 * Mapeamento de status → variante visual. Cobre nesta rodada os status
 * reais de `Membro` (`StatusMembro`) e `Convite` (`StatusConvite`) do
 * backend (`apps/api/prisma/schema.prisma`) — ampliar o mapa conforme
 * novos domínios com status próprio forem implementados.
 */
const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  ATIVO: 'success',
  INATIVO: 'secondary',
  SUSPENSO: 'destructive',
  PENDENTE: 'outline',
  ACEITO: 'success',
  EXPIRADO: 'secondary',
  REVOGADO: 'destructive',
  ARQUIVADO: 'secondary',
  ENCERRADO: 'secondary',
  EM_ANDAMENTO: 'outline',
  CONCLUIDO: 'success',
  CANCELADO: 'secondary',
  ATRASADO: 'destructive',
  // `situacaoAcesso` de Colaborador (Sprint "Colaboradores") — SUSPENSO já
  // coberto acima, INATIVO idem.
  DESBLOQUEADO: 'success',
  BLOQUEADO: 'destructive',
  CONVITE_PENDENTE: 'outline',
  SEM_ACESSO: 'secondary',
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  SUSPENSO: 'Suspenso',
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  EXPIRADO: 'Expirado',
  REVOGADO: 'Revogado',
  ARQUIVADO: 'Arquivado',
  ENCERRADO: 'Encerrado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  ATRASADO: 'Atrasado',
  DESBLOQUEADO: 'Desbloqueado',
  BLOQUEADO: 'Bloqueado',
  CONVITE_PENDENTE: 'Convite pendente',
  SEM_ACESSO: 'Sem acesso',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'outline'}>{STATUS_LABEL[status] ?? status}</Badge>;
}
