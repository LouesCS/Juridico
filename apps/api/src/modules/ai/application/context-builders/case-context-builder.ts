import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
  ScopeActor,
} from '../../../legal-cases/application/case-scope';
import { AiContextResult, FonteIaDraft } from '../../domain/ai-types';
import { hashContent } from '../context-hash';

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
 * Reafirma Sprint 11 §"IA DO PROCESSO"/§"IA DA TIMELINE" — monta o contexto
 * (campos + listas + fontes) para os templates `resumo-processo-*`. Reusa
 * `case-scope.ts` (mesmos helpers já testados de Legal Cases/Search) —
 * nenhuma regra de segredo de justiça/escopo duplicada.
 */
@Injectable()
export class CaseContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(
    escritorioId: string,
    processoId: string,
    user: AuthUser,
  ): Promise<Result<AiContextResult>> {
    const scope = resolveCaseReadScope(user.permissions);
    if (!scope) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const teamMemberIds =
      scope === 'TEAM' ? await resolveTeamMemberIds(this.prisma, escritorioId, user.membroId) : [];
    const actor: ScopeActor = { membroId: user.membroId, teamMemberIds };

    const processo = await this.prisma.client.processo.findFirst({
      where: {
        id: processoId,
        escritorioId,
        ...buildCaseScopeWhere(scope, actor),
        ...applyConfidentialityFilter(user.permissions),
      },
      include: { cliente: { select: { id: true, nome: true } } },
    });
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const [prazos, eventos, documentos] = await Promise.all([
      this.prisma.client.prazo.findMany({
        where: { processoId, status: 'PENDENTE' },
        orderBy: { dataVencimento: 'asc' },
        take: 5,
      }),
      this.prisma.client.eventoTimeline.findMany({
        where: { processoId },
        orderBy: { dataEvento: 'desc' },
        take: 10,
      }),
      this.prisma.client.documento.findMany({
        where: { processoId, excluidoEm: null },
        orderBy: { atualizadoEm: 'desc' },
        take: 10,
      }),
    ]);

    const fontes: FonteIaDraft[] = [
      {
        sourceType: 'METADADO_PROCESSO',
        processoId: processo.id,
        trechoOuReferencia: `Metadados do processo — ${processo.titulo}`,
        hashFonte: hashContent({
          titulo: processo.titulo,
          status: processo.status,
          atualizadoEm: processo.atualizadoEm,
        }),
      },
      ...eventos.map((e): FonteIaDraft => ({
        sourceType: 'EVENTO_TIMELINE',
        eventoTimelineId: e.id,
        trechoOuReferencia: e.titulo,
        hashFonte: hashContent({
          titulo: e.titulo,
          descricao: e.descricao,
          dataEvento: e.dataEvento,
        }),
      })),
      ...documentos.map((d): FonteIaDraft => ({
        sourceType: 'DOCUMENTO',
        documentoId: d.id,
        trechoOuReferencia: d.nome,
        hashFonte: hashContent({ nome: d.nome, atualizadoEm: d.atualizadoEm }),
      })),
    ];

    return Result.ok({
      promptContext: {
        campos: {
          Título: processo.titulo,
          Cliente: processo.cliente.nome,
          Status: processo.status,
          Prioridade: processo.prioridade,
          Área: processo.area,
          'Número CNJ': processo.numeroCnj,
          'Segredo de justiça': processo.segredoJustica ? 'Sim' : 'Não',
          'Próximo prazo': prazos[0]
            ? `${prazos[0].titulo} em ${formatDate(prazos[0].dataVencimento)}`
            : null,
        },
        listas: {
          'Últimos eventos da timeline': eventos.map(
            (e) =>
              `${formatDate(e.dataEvento)} — ${e.titulo}${e.descricao ? `: ${e.descricao}` : ''}`,
          ),
          'Próximos prazos': prazos.map(
            (p) => `${p.titulo} (${p.tipo}) em ${formatDate(p.dataVencimento)}`,
          ),
          'Documentos recentes': documentos.map((d) => `${d.nome} (${d.tipo})`),
        },
      },
      fontes,
    });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
