import { Injectable } from '@nestjs/common';
import { PlanoEscritorio } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import {
  applyDocumentConfidentialityFilter,
  buildDocumentScopeWhere,
  resolveCaseReadScope,
  resolveDocumentReadScope,
  ScopeActor,
} from '../document-scope';

/**
 * Quota por plano ainda não existe como modelo de dados próprio (não há
 * módulo de billing/planos nesta fase) — usado como referência de exibição
 * para o "Indicador de armazenamento" do Dashboard, documentado como
 * placeholder de produto até que um módulo de planos real defina isso.
 */
const QUOTA_BYTES_POR_PLANO: Record<PlanoEscritorio, number> = {
  TRIAL: 1 * 1024 ** 3,
  ESSENCIAL: 5 * 1024 ** 3,
  PROFISSIONAL: 20 * 1024 ** 3,
  ENTERPRISE: 100 * 1024 ** 3,
};

/** Sustenta os cards "Documentos recentes / Uploads recentes / Favoritos / Indicador de armazenamento" do Dashboard. */
@Injectable()
export class DocumentsDashboardSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser) {
    const actor: ScopeActor = { membroId: user.membroId, teamMemberIds: [] };
    const scopeWhere = buildDocumentScopeWhere(
      resolveCaseReadScope(user.permissions),
      resolveDocumentReadScope(user.permissions),
      actor,
    );
    const confidentialityWhere = applyDocumentConfidentialityFilter(user.permissions);
    const baseWhere = { escritorioId, AND: [scopeWhere, confidentialityWhere] };

    const [recentes, favoritos, totais, escritorio] = await Promise.all([
      this.prisma.client.documento.findMany({
        where: baseWhere,
        orderBy: { atualizadoEm: 'desc' },
        take: 6,
        select: { id: true, nome: true, extensao: true, tipo: true, atualizadoEm: true },
      }),
      this.prisma.client.documento.findMany({
        where: { ...baseWhere, favoritos: { some: { membroId: user.membroId } } },
        orderBy: { atualizadoEm: 'desc' },
        take: 6,
        select: { id: true, nome: true, extensao: true, tipo: true, atualizadoEm: true },
      }),
      this.prisma.client.documento.aggregate({
        where: { escritorioId },
        _sum: { tamanhoBytes: true },
        _count: { id: true },
      }),
      this.prisma.client.escritorio.findFirst({
        where: { id: escritorioId },
        select: { plano: true },
      }),
    ]);

    const bytesUsados = totais._sum.tamanhoBytes ?? BigInt(0);
    const quotaBytes = QUOTA_BYTES_POR_PLANO[escritorio?.plano ?? 'TRIAL'];

    return {
      recentes,
      favoritos,
      totalDocumentos: totais._count.id,
      armazenamento: {
        bytesUsados: bytesUsados.toString(),
        bytesQuota: quotaBytes.toString(),
        percentualUsado: Math.min(100, Math.round((Number(bytesUsados) / quotaBytes) * 100)),
      },
    };
  }
}
