import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError } from '../../../../shared/domain/result';

/**
 * Extraído de `RemoveMemberUseCase`/`UpdateMemberRoleUseCase` (duplicado em
 * ambos antes desta rodada) — a regra de segurança mais crítica deste
 * módulo: nenhuma ação (remover, alterar papel, bloquear, suspender,
 * revogar acesso) pode deixar o escritório sem nenhum OWNER ativo. Reafirma
 * docs/database/12-eventos-fluxos-regras.md §12.3.11.
 *
 * Recebe o `Membro` alvo já carregado (com `papel.nome`) para não repetir a
 * mesma consulta em cada chamador — só dispara a consulta extra (`count`)
 * quando o alvo é de fato OWNER.
 */
export async function assertNotLastActiveOwner(
  prisma: PrismaService,
  escritorioId: string,
  alvoMembroId: string,
  alvoPapelNome: string,
): Promise<DomainError | null> {
  if (alvoPapelNome !== 'OWNER') return null;

  const outrosOwnersAtivos = await prisma.client.membro.count({
    where: {
      escritorioId,
      status: 'ATIVO',
      papel: { nome: 'OWNER' },
      id: { not: alvoMembroId },
    },
  });
  if (outrosOwnersAtivos === 0) {
    return new DomainError('LAST_OWNER', 'O escritório precisa de ao menos um Owner ativo.');
  }
  return null;
}
