import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
  ScopeActor,
} from '../../../legal-cases/application/case-scope';

async function resolveTeamMemberIds(
  prisma: PrismaService,
  escritorioId: string,
  membroId: string,
): Promise<string[]> {
  const membro = await prisma.client.membro.findFirst({
    where: { id: membroId },
    select: { equipeId: true },
  });
  if (!membro?.equipeId) return [];
  const colegas = await prisma.client.membro.findMany({
    where: { equipeId: membro.equipeId, escritorioId },
    select: { id: true },
  });
  return colegas.map((c) => c.id);
}

/**
 * Reafirma Sprint 11 §"IA DO DASHBOARD" — "✨ Assistente Jurídico" com
 * insights como "Hoje existem 5 prazos críticos" / "processo X está há 42
 * dias sem movimentação". **Regras determinísticas sobre dados reais, não
 * uma chamada ao provedor de IA** — não há geração de texto livre aqui,
 * apenas agregações formatadas como frases; rotear isso por
 * `AiProviderRegistry` adicionaria latência/custo sem nenhum ganho (nenhuma
 * das frases exige raciocínio, só contagem). O rótulo visual "Assistente
 * Jurídico" é sobre apresentação ao usuário, não sobre a implementação —
 * documentado explicitamente para não sugerir uma chamada de IA que não
 * existe.
 */
@Injectable()
export class DashboardInsightsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser): Promise<{ insights: string[] }> {
    const insights: string[] = [];
    const scope = resolveCaseReadScope(user.permissions);

    if (scope) {
      const teamMemberIds =
        scope === 'TEAM'
          ? await resolveTeamMemberIds(this.prisma, escritorioId, user.membroId)
          : [];
      const actor: ScopeActor = { membroId: user.membroId, teamMemberIds };
      const scopeWhere = {
        ...buildCaseScopeWhere(scope, actor),
        ...applyConfidentialityFilter(user.permissions),
      };

      const em3Dias = new Date();
      em3Dias.setDate(em3Dias.getDate() + 3);
      const prazosCriticos = await this.prisma.client.prazo.count({
        where: {
          escritorioId,
          status: 'PENDENTE',
          dataVencimento: { lte: em3Dias },
          processo: scopeWhere,
        },
      });
      if (prazosCriticos > 0) {
        insights.push(
          `Hoje existem ${prazosCriticos} prazo${prazosCriticos > 1 ? 's' : ''} crítico${prazosCriticos > 1 ? 's' : ''} vencendo nos próximos 3 dias.`,
        );
      }

      const ha30Dias = new Date();
      ha30Dias.setDate(ha30Dias.getDate() - 30);
      const processoParado = await this.prisma.client.processo.findFirst({
        where: {
          escritorioId,
          status: 'ATIVO',
          ...scopeWhere,
          eventosTimeline: { none: { dataEvento: { gte: ha30Dias } } },
        },
        orderBy: { ultimaAtualizacaoEm: 'asc' },
        select: { titulo: true, ultimaAtualizacaoEm: true },
      });
      if (processoParado) {
        const dias = Math.floor(
          (Date.now() - processoParado.ultimaAtualizacaoEm.getTime()) / (1000 * 60 * 60 * 24),
        );
        insights.push(
          `O processo "${processoParado.titulo}" está há ${dias} dias sem movimentação.`,
        );
      }
    }

    if (user.permissions.includes('client:read')) {
      const ha90Dias = new Date();
      ha90Dias.setDate(ha90Dias.getDate() - 90);
      const clientesDesatualizados = await this.prisma.client.cliente.count({
        where: { escritorioId, status: 'ATIVO', atualizadoEm: { lte: ha90Dias } },
      });
      if (clientesDesatualizados > 0) {
        insights.push(
          `Há ${clientesDesatualizados} cliente${clientesDesatualizados > 1 ? 's' : ''} sem atualização cadastral há mais de 90 dias.`,
        );
      }
    }

    if (
      user.permissions.includes('document:read:all') ||
      user.permissions.includes('document:read:assigned')
    ) {
      const ha90Dias = new Date();
      ha90Dias.setDate(ha90Dias.getDate() - 90);
      const documentosSemVersaoRecente = await this.prisma.client.documento.count({
        where: { escritorioId, versao: 1, criadoEm: { lte: ha90Dias }, excluidoEm: null },
      });
      if (documentosSemVersaoRecente > 0) {
        insights.push(
          `Há ${documentosSemVersaoRecente} documento${documentosSemVersaoRecente > 1 ? 's' : ''} sem nova versão há mais de 90 dias.`,
        );
      }
    }

    return { insights };
  }
}
