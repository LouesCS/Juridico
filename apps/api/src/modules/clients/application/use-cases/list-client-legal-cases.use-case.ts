import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
} from '../../../legal-cases/application/case-scope';

/**
 * Reafirma docs/api/08-clients.md §8.6 — processo sob segredo de justiça
 * sem acesso simplesmente não aparece na lista (nunca gera erro).
 * Simplificação registrada: filtra apenas `Processo.clienteId = :id`
 * (cliente titular); a variante "cliente aparece como `ParteProcesso`"
 * fica para a próxima rodada junto de Partes/Relacionados (ver
 * docs/backend-implementation/21-context-next-step.md).
 */
@Injectable()
export class ListClientLegalCasesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, clienteId: string, user: AuthUser) {
    const scope = resolveCaseReadScope(user.permissions);
    if (!scope) return [];

    const equipe = await this.prisma.client.membro.findFirst({
      where: { id: user.membroId },
      select: { equipeId: true },
    });
    const teamMemberIds = equipe?.equipeId
      ? (
          await this.prisma.client.membro.findMany({
            where: { equipeId: equipe.equipeId, escritorioId },
            select: { id: true },
          })
        ).map((m) => m.id)
      : [];

    const where: Prisma.ProcessoWhereInput = {
      escritorioId,
      clienteId,
      ...buildCaseScopeWhere(scope, { membroId: user.membroId, teamMemberIds }),
      ...applyConfidentialityFilter(user.permissions),
    };

    const processos = await this.prisma.client.processo.findMany({
      where,
      orderBy: { ultimaAtualizacaoEm: 'desc' },
    });

    return processos.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      numeroCnj: p.numeroCnj,
      status: p.status,
      prioridade: p.prioridade,
      proximaDataRelevante: p.proximaDataRelevante,
      versao: p.versao,
    }));
  }
}
