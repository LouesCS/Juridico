import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { sanitizeForAudit } from './sanitize-for-audit';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LegalFoldersService } from '../../legal-folders/application/legal-folders.service';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
} from '../../legal-cases/application/case-scope';

export type ResultadoAuditoria = 'SUCESSO' | 'FALHA' | 'NEGADO';
export type AtorTipoAuditoria = 'USUARIO' | 'SISTEMA' | 'API';

export interface AuditEntry {
  acao: string;
  recursoTipo: string;
  recursoId?: string | null;
  resultado: ResultadoAuditoria;
  escritorioId?: string | null;
  atorId?: string | null;
  atorTipo?: AtorTipoAuditoria;
  sessaoId?: string | null;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  correlationId: string;
  motivo?: string | null;
  metadados?: Record<string, unknown>;
}

export const AUDIT_RECENT_DAYS = 90;

/**
 * `LogAuditoria` não é tenant-scoped (fora de `TENANT_SCOPED_MODELS`) nem
 * soft-delete — grava mesmo sem `TenantContext` ativo, necessário para
 * eventos pré-autenticação (falha de login, registro). Reafirma PROMPT 5C
 * Etapa 1 e docs/backend-implementation/19-decisions.md §19.8.
 *
 * Auditoria é caminho secundário: uma falha ao gravar o log NUNCA deve
 * derrubar a operação de negócio que está sendo auditada — apenas logada.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly legalFolders?: LegalFoldersService,
  ) {}

  async listContext(
    user: AuthUser,
    query: {
      resourceType: string;
      resourceId: string;
      page: number;
      limit: number;
      period?: 'RECENTES' | 'ANTIGAS';
    },
  ) {
    await this.assertResourceAccess(user, query.resourceType, query.resourceId);
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - AUDIT_RECENT_DAYS);
    const where = {
      escritorioId: user.escritorioId,
      recursoTipo: query.resourceType,
      recursoId: query.resourceId,
      criadoEm: query.period === 'ANTIGAS' ? { lt: cutoff } : { gte: cutoff },
    };
    const [items, total] = await Promise.all([
      this.prisma.client.logAuditoria.findMany({
        where,
        orderBy: { criadoEm: 'desc' as const },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          acao: true,
          resultado: true,
          atorTipo: true,
          atorId: true,
          recursoTipo: true,
          recursoId: true,
          dadosAntes: true,
          dadosDepois: true,
          criadoEm: true,
          motivo: true,
        },
      }),
      this.prisma.client.logAuditoria.count({ where }),
    ]);
    const actorIds = [...new Set(items.flatMap((item) => (item.atorId ? [item.atorId] : [])))];
    const actors = actorIds.length
      ? await this.prisma.client.usuario.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, nome: true },
        })
      : [];
    const actorNames = new Map(actors.map((actor) => [actor.id, actor.nome]));
    return {
      items: items.map((item) => ({
        ...item,
        atorNome: item.atorId ? (actorNames.get(item.atorId) ?? null) : null,
      })),
      total,
      page: query.page,
      limit: query.limit,
      period: query.period ?? 'RECENTES',
      cutoff: cutoff.toISOString(),
    };
  }

  private async assertResourceAccess(user: AuthUser, type: string, id: string) {
    if (type === 'PASTA_JURIDICA') {
      if (!this.legalFolders) throw new NotFoundException();
      await this.legalFolders.get(user, id);
      return;
    }
    if (type === 'PROCESSO') {
      const scope = resolveCaseReadScope(user.permissions);
      if (!scope) throw new NotFoundException();
      const member = await this.prisma.client.membro.findFirst({
        where: { id: user.membroId, escritorioId: user.escritorioId },
        select: { equipeId: true },
      });
      const teamMemberIds = member?.equipeId
        ? (
            await this.prisma.client.membro.findMany({
              where: { escritorioId: user.escritorioId, equipeId: member.equipeId },
              select: { id: true },
            })
          ).map((item) => item.id)
        : [];
      const item = await this.prisma.client.processo.findFirst({
        where: {
          id,
          escritorioId: user.escritorioId,
          ...buildCaseScopeWhere(scope, { membroId: user.membroId, teamMemberIds }),
          ...applyConfidentialityFilter(user.permissions),
        },
        select: { id: true },
      });
      if (!item) throw new NotFoundException();
      return;
    }
    if (type === 'MOVIMENTACAO_JUDICIAL') {
      if (!user.permissions.includes('movement:read')) throw new ForbiddenException();
      const item = await this.prisma.client.movimentoJudicialCapturado.findFirst({
        where: { id, escritorioId: user.escritorioId },
        select: { id: true },
      });
      if (!item) throw new NotFoundException();
      return;
    }
    if (type === 'MOVIMENTACAO_EXTRAJUDICIAL') {
      if (!user.permissions.includes('extrajudicial-movement:read')) throw new ForbiddenException();
      const item = await this.prisma.client.movimentacaoExtrajudicial.findFirst({
        where: { id, escritorioId: user.escritorioId, excluidoEm: null },
        select: { id: true },
      });
      if (!item) throw new NotFoundException();
      return;
    }
    if (type === 'PEDIDO') {
      if (!user.permissions.includes('request:read')) throw new ForbiddenException();
      const item = await this.prisma.client.pedido.findFirst({
        where: { id, escritorioId: user.escritorioId, excluidoEm: null },
        select: { id: true },
      });
      if (!item) throw new NotFoundException();
      return;
    }
    throw new NotFoundException('Tipo de recurso não suportado.');
  }

  async registrar(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.client.logAuditoria.create({
        data: {
          escritorioId: entry.escritorioId ?? null,
          atorId: entry.atorId ?? null,
          atorTipo: entry.atorTipo ?? 'USUARIO',
          sessaoId: entry.sessaoId ?? null,
          acao: entry.acao,
          recursoTipo: entry.recursoTipo,
          recursoId: entry.recursoId ?? null,
          dadosAntes: sanitizeForAudit(entry.dadosAntes) as never,
          dadosDepois: sanitizeForAudit(entry.dadosDepois) as never,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          correlationId: entry.correlationId,
          resultado: entry.resultado,
          motivo: entry.motivo ?? null,
          metadados: (entry.metadados ?? {}) as never,
        },
      });
    } catch (err) {
      this.logger.error(
        `Falha ao gravar log de auditoria (ação=${entry.acao}, recurso=${entry.recursoTipo}): ${(err as Error).message}`,
      );
    }
  }
}
