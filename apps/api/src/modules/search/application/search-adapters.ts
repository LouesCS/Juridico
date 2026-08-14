import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
  ScopeActor,
} from '../../legal-cases/application/case-scope';
import {
  applyDocumentConfidentialityFilter,
  resolveDocumentReadScope,
} from '../../documents/application/document-scope';
import {
  buildTaskScopeWhere,
  resolveTaskReadScope,
  TaskScopeActor,
} from '../../tasks/application/task-scope';
import { buildSnippet, computeScore, onlyDigits, textRank } from './search-ranking';
import {
  SearchAdapter,
  SearchContext,
  SearchGroupResult,
  SearchResultItem,
} from '../domain/search-types';

/**
 * Reafirma docs/api/15-search.md e docs/ux/09-busca-global.md §9.6 (o que é
 * buscado por tipo de entidade). Um adapter por tipo — nenhum lê a tabela
 * "crua"; todos reaproveitam os mesmos helpers de escopo/confidencialidade já
 * testados de `legal-cases/application/case-scope.ts` e
 * `documents/application/document-scope.ts` (nenhuma regra de autorização é
 * duplicada, reafirma docs/database/09-indices-busca-performance.md §9.3.3:
 * "filtro de permissão... resolvido pela mesma função de autorização usada na
 * leitura direta do recurso"). Ver `search-ranking.ts` para o porquê de
 * `contains`/`mode:"insensitive"` no lugar de FTS/trigram nesta rodada.
 */

function emptyGroup(type: SearchResultItem['tipo']): SearchGroupResult {
  return { type, total: 0, items: [] };
}

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

@Injectable()
export class ClientSearchAdapter implements SearchAdapter {
  readonly type = 'clients' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    if (!ctx.user.permissions.includes('client:read')) return emptyGroup(this.type);

    const digits = onlyDigits(ctx.q);
    const where: Prisma.ClienteWhereInput = {
      escritorioId: ctx.escritorioId,
      OR: [
        { nome: { contains: ctx.q, mode: 'insensitive' } },
        { razaoSocial: { contains: ctx.q, mode: 'insensitive' } },
        ...(digits.length >= 3
          ? [
              { cpf: { contains: digits } },
              { cnpj: { contains: digits } },
              { rg: { contains: digits } },
            ]
          : []),
        { emails: { has: ctx.q } },
        { telefones: { has: ctx.q } },
      ],
    };

    const [total, clientes] = await Promise.all([
      this.prisma.client.cliente.count({ where }),
      this.prisma.client.cliente.findMany({
        where,
        take: ctx.limit,
        orderBy: { atualizadoEm: 'desc' },
      }),
    ]);

    // A busca global mostra o CPF/CNPJ por completo — proteção é por acesso
    // ao recurso (`client:read`, checado acima, mais `escritorioId` no
    // `where`), não por mascarar campo de um cliente que o usuário já pode
    // ver (docs/backend-implementation/21-permission-engine.md §21.4,
    // revisado pela Sprint "Remover mascaramento de dados do cliente em
    // Processos").
    const items = clientes
      .map((c): SearchResultItem => {
        const rank = textRank(ctx.q, c.nome, [
          c.razaoSocial,
          c.cpf,
          c.cnpj,
          c.rg,
          ...c.emails,
          ...c.telefones,
        ]);
        const documento = c.tipo === 'PESSOA_FISICA' ? c.cpf : c.cnpj;
        return {
          id: c.id,
          tipo: this.type,
          titulo: c.nome,
          subtitulo:
            c.razaoSocial ?? (c.tipo === 'PESSOA_FISICA' ? 'Pessoa física' : 'Pessoa jurídica'),
          snippet: null,
          url: `/clientes/${c.id}`,
          score: computeScore(rank, c.atualizadoEm),
          metadata: {
            tipo: c.tipo,
            documento,
            rg: c.rg,
            emails: c.emails,
            telefones: c.telefones,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

@Injectable()
export class LegalCaseSearchAdapter implements SearchAdapter {
  readonly type = 'legal-cases' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    const scope = resolveCaseReadScope(ctx.user.permissions);
    if (!scope) return emptyGroup(this.type);

    const teamMemberIds =
      scope === 'TEAM'
        ? await resolveTeamMemberIds(this.prisma, ctx.escritorioId, ctx.user.membroId)
        : [];
    const actor: ScopeActor = { membroId: ctx.user.membroId, teamMemberIds };
    const digits = onlyDigits(ctx.q);

    const where: Prisma.ProcessoWhereInput = {
      escritorioId: ctx.escritorioId,
      AND: [buildCaseScopeWhere(scope, actor), applyConfidentialityFilter(ctx.user.permissions)],
      OR: [
        { titulo: { contains: ctx.q, mode: 'insensitive' } },
        { descricao: { contains: ctx.q, mode: 'insensitive' } },
        ...(digits.length >= 3
          ? [
              { numeroCnjSomenteDigitos: { contains: digits } },
              { numeroInterno: { contains: digits } },
            ]
          : []),
      ],
    };

    const [total, processos] = await Promise.all([
      this.prisma.client.processo.count({ where }),
      this.prisma.client.processo.findMany({
        where,
        take: ctx.limit,
        orderBy: { ultimaAtualizacaoEm: 'desc' },
        include: { cliente: { select: { id: true, nome: true } } },
      }),
    ]);

    const items = processos
      .map((p): SearchResultItem => {
        const rank = textRank(ctx.q, p.titulo, [p.numeroCnj, p.numeroInterno]);
        return {
          id: p.id,
          tipo: this.type,
          titulo: p.titulo,
          subtitulo: p.numeroCnj ?? p.numeroInterno ?? p.cliente.nome,
          snippet: buildSnippet(p.descricao, ctx.q),
          url: `/processos/${p.id}`,
          score: computeScore(rank, p.atualizadoEm),
          metadata: {
            status: p.status,
            prioridade: p.prioridade,
            segredoJustica: p.segredoJustica,
            cliente: { id: p.cliente.id, nome: p.cliente.nome },
            proximaDataRelevante: p.proximaDataRelevante,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

@Injectable()
export class DocumentSearchAdapter implements SearchAdapter {
  readonly type = 'documents' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    const caseScope = resolveCaseReadScope(ctx.user.permissions);
    const documentScope = resolveDocumentReadScope(ctx.user.permissions);
    if (!caseScope && !documentScope) return emptyGroup(this.type);

    const teamMemberIds =
      caseScope === 'TEAM'
        ? await resolveTeamMemberIds(this.prisma, ctx.escritorioId, ctx.user.membroId)
        : [];
    const actor: ScopeActor = { membroId: ctx.user.membroId, teamMemberIds };

    const branches: Prisma.DocumentoWhereInput[] = [];
    if (caseScope) {
      branches.push({
        processoId: { not: null },
        processo: buildCaseScopeWhere(caseScope, actor),
      });
    }
    if (documentScope) {
      branches.push({
        processoId: null,
        ...(documentScope === 'ALL' ? {} : { autorUploadId: ctx.user.membroId }),
      });
    }
    if (branches.length === 0) return emptyGroup(this.type);

    // `AND` explícito (não spread solto) — o filtro de escopo já usa a chave
    // `OR` internamente (múltiplos processos possíveis); combiná-lo por
    // spread com o `OR` de texto abaixo faria a segunda declaração sobrepor
    // silenciosamente a primeira (mesma chave duplicada em objeto literal),
    // vazando documentos fora do escopo do usuário. Mesmo racional de
    // `AND: [scopeWhere, confidentialityWhere]` em
    // `list-documents-aggregate.use-case.ts`.
    const where: Prisma.DocumentoWhereInput = {
      escritorioId: ctx.escritorioId,
      AND: [
        branches.length === 1 ? branches[0] : { OR: branches },
        applyDocumentConfidentialityFilter(ctx.user.permissions),
        {
          OR: [
            { nome: { contains: ctx.q, mode: 'insensitive' } },
            { nomeOriginal: { contains: ctx.q, mode: 'insensitive' } },
          ],
        },
      ],
    };

    const [total, documentos] = await Promise.all([
      this.prisma.client.documento.count({ where }),
      this.prisma.client.documento.findMany({
        where,
        take: ctx.limit,
        orderBy: { atualizadoEm: 'desc' },
        include: {
          processo: { select: { id: true, titulo: true } },
          tags: { include: { tag: { select: { nome: true } } } },
        },
      }),
    ]);

    // `Documento.clienteId` é coluna solta (sem relação Prisma) — mesmo
    // padrão de `list-documents-aggregate.use-case.ts`.
    const clienteIds = [
      ...new Set(documentos.map((d) => d.clienteId).filter((id): id is string => !!id)),
    ];
    const clientes = clienteIds.length
      ? await this.prisma.client.cliente.findMany({
          where: { id: { in: clienteIds } },
          select: { id: true, nome: true },
        })
      : [];
    const clientePorId = new Map(clientes.map((c) => [c.id, c]));

    const items = documentos
      .map((d): SearchResultItem => {
        const rank = textRank(ctx.q, d.nome, [d.nomeOriginal]);
        return {
          id: d.id,
          tipo: this.type,
          titulo: d.nome,
          subtitulo:
            d.processo?.titulo ?? (d.clienteId && clientePorId.get(d.clienteId)?.nome) ?? null,
          snippet: null,
          url: `/documentos/${d.id}`,
          score: computeScore(rank, d.atualizadoEm),
          metadata: {
            extensao: d.extensao,
            tipo: d.tipo,
            tamanhoBytes: d.tamanhoBytes.toString(),
            versao: d.versao,
            statusAntivirus: d.statusAntivirus,
            processo: d.processo,
            cliente:
              d.clienteId && clientePorId.has(d.clienteId) ? clientePorId.get(d.clienteId) : null,
            tags: d.tags.map((t) => t.tag.nome),
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

@Injectable()
export class DeadlineSearchAdapter implements SearchAdapter {
  readonly type = 'deadlines' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    const scope = resolveCaseReadScope(ctx.user.permissions);
    if (!scope) return emptyGroup(this.type);

    const teamMemberIds =
      scope === 'TEAM'
        ? await resolveTeamMemberIds(this.prisma, ctx.escritorioId, ctx.user.membroId)
        : [];
    const actor: ScopeActor = { membroId: ctx.user.membroId, teamMemberIds };

    const where: Prisma.PrazoWhereInput = {
      escritorioId: ctx.escritorioId,
      processo: {
        ...buildCaseScopeWhere(scope, actor),
        ...applyConfidentialityFilter(ctx.user.permissions),
      },
      titulo: { contains: ctx.q, mode: 'insensitive' },
    };

    const [total, prazos] = await Promise.all([
      this.prisma.client.prazo.count({ where }),
      this.prisma.client.prazo.findMany({
        where,
        take: ctx.limit,
        orderBy: { dataVencimento: 'desc' },
        include: { processo: { select: { id: true, titulo: true } } },
      }),
    ]);

    const items = prazos
      .map((p): SearchResultItem => {
        const rank = textRank(ctx.q, p.titulo);
        return {
          id: p.id,
          tipo: this.type,
          titulo: p.titulo,
          subtitulo: p.processo.titulo,
          snippet: buildSnippet(p.descricao, ctx.q),
          url: `/processos/${p.processo.id}?tab=prazos`,
          score: computeScore(rank, p.atualizadoEm),
          metadata: {
            tipo: p.tipo,
            status: p.status,
            prioridade: p.prioridade,
            dataVencimento: p.dataVencimento,
            processo: p.processo,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

@Injectable()
export class TimelineSearchAdapter implements SearchAdapter {
  readonly type = 'timeline' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    const scope = resolveCaseReadScope(ctx.user.permissions);
    if (!scope) return emptyGroup(this.type);

    const teamMemberIds =
      scope === 'TEAM'
        ? await resolveTeamMemberIds(this.prisma, ctx.escritorioId, ctx.user.membroId)
        : [];
    const actor: ScopeActor = { membroId: ctx.user.membroId, teamMemberIds };

    const where: Prisma.EventoTimelineWhereInput = {
      escritorioId: ctx.escritorioId,
      processo: {
        ...buildCaseScopeWhere(scope, actor),
        ...applyConfidentialityFilter(ctx.user.permissions),
      },
      OR: [
        { titulo: { contains: ctx.q, mode: 'insensitive' } },
        { descricao: { contains: ctx.q, mode: 'insensitive' } },
      ],
    };

    const [total, eventos] = await Promise.all([
      this.prisma.client.eventoTimeline.count({ where }),
      this.prisma.client.eventoTimeline.findMany({
        where,
        take: ctx.limit,
        orderBy: { dataEvento: 'desc' },
        include: { processo: { select: { id: true, titulo: true } } },
      }),
    ]);

    const items = eventos
      .map((e): SearchResultItem => {
        const rank = textRank(ctx.q, e.titulo);
        // `where.processo` (relation filter) já garante que só vêm eventos
        // com processo associado — `processoId` virou nullable no schema no
        // Prompt 14 (Task Engine) para acomodar eventos de Tarefa, que esta
        // query nunca retorna.
        const processo = e.processo!;
        return {
          id: e.id,
          tipo: this.type,
          titulo: e.titulo,
          subtitulo: processo.titulo,
          snippet: buildSnippet(e.descricao, ctx.q),
          url: `/processos/${processo.id}?tab=timeline`,
          score: computeScore(rank, e.dataEvento),
          metadata: {
            tipoEvento: e.tipo,
            dataEvento: e.dataEvento,
            origem: e.origem,
            processo,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

@Injectable()
export class TeamSearchAdapter implements SearchAdapter {
  readonly type = 'team' as const;
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consolida "Equipe" (modelo `Equipe`, grupos) e "Usuários" (`Membro`/
   * `Usuario`, pessoas) num único grupo — ver nota em `search-types.ts`.
   */
  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    if (!ctx.user.permissions.includes('member:read')) return emptyGroup(this.type);

    const membroWhere: Prisma.MembroWhereInput = {
      escritorioId: ctx.escritorioId,
      status: 'ATIVO',
      usuario: {
        excluidoEm: null,
        OR: [
          { nome: { contains: ctx.q, mode: 'insensitive' } },
          { sobrenome: { contains: ctx.q, mode: 'insensitive' } },
          { email: { contains: ctx.q, mode: 'insensitive' } },
        ],
      },
    };
    const equipeWhere: Prisma.EquipeWhereInput = {
      escritorioId: ctx.escritorioId,
      nome: { contains: ctx.q, mode: 'insensitive' },
    };

    const [totalMembros, totalEquipes, membros, equipes] = await Promise.all([
      this.prisma.client.membro.count({ where: membroWhere }),
      this.prisma.client.equipe.count({ where: equipeWhere }),
      this.prisma.client.membro.findMany({
        where: membroWhere,
        take: ctx.limit,
        include: { usuario: true, papel: { select: { nome: true } } },
      }),
      this.prisma.client.equipe.findMany({ where: equipeWhere, take: ctx.limit }),
    ]);

    const itemsMembros = membros.map((m): SearchResultItem => {
      // `m.usuario` pode ser `null` desde o módulo Colaboradores (colaborador
      // sem conta de acesso) — cai para `Membro.nome`/`Membro.email`
      // (fonte canônica de identidade, sempre preenchida) nesse caso.
      const nomeCompleto = m.usuario ? `${m.usuario.nome} ${m.usuario.sobrenome}` : m.nome;
      const email = m.usuario?.email ?? m.email;
      const rank = textRank(ctx.q, nomeCompleto, [email]);
      return {
        id: m.id,
        tipo: this.type,
        titulo: nomeCompleto,
        subtitulo: m.cargo ?? m.papel.nome,
        snippet: null,
        url: '/admin/usuarios',
        score: computeScore(rank),
        metadata: {
          subtipo: 'membro',
          email,
          avatarUrl: m.usuario?.avatarUrl ?? m.fotoUrl ?? null,
          papel: m.papel.nome,
        },
      };
    });

    const itemsEquipes = equipes.map((e): SearchResultItem => {
      const rank = textRank(ctx.q, e.nome);
      return {
        id: e.id,
        tipo: this.type,
        titulo: e.nome,
        subtitulo: 'Equipe',
        snippet: null,
        url: '/admin/usuarios',
        score: computeScore(rank),
        metadata: { subtipo: 'equipe' },
      };
    });

    const items = [...itemsMembros, ...itemsEquipes]
      .sort((a, b) => b.score - a.score)
      .slice(0, ctx.limit);

    return { type: this.type, total: totalMembros + totalEquipes, items };
  }
}

@Injectable()
export class FolderSearchAdapter implements SearchAdapter {
  readonly type = 'folders' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    const caseScope = resolveCaseReadScope(ctx.user.permissions);
    const documentScope = resolveDocumentReadScope(ctx.user.permissions);
    if (!caseScope && !documentScope) return emptyGroup(this.type);

    const teamMemberIds =
      caseScope === 'TEAM'
        ? await resolveTeamMemberIds(this.prisma, ctx.escritorioId, ctx.user.membroId)
        : [];
    const actor: ScopeActor = { membroId: ctx.user.membroId, teamMemberIds };

    const branches: Prisma.PastaWhereInput[] = [];
    if (caseScope) {
      branches.push({
        processoId: { not: null },
        processo: {
          ...buildCaseScopeWhere(caseScope, actor),
          ...applyConfidentialityFilter(ctx.user.permissions),
        },
      });
    }
    if (documentScope) {
      branches.push({
        processoId: null,
        ...(documentScope === 'ALL' ? {} : { criadaPorId: ctx.user.membroId }),
      });
    }
    if (branches.length === 0) return emptyGroup(this.type);

    const where: Prisma.PastaWhereInput = {
      escritorioId: ctx.escritorioId,
      nome: { contains: ctx.q, mode: 'insensitive' },
      ...(branches.length === 1 ? branches[0] : { OR: branches }),
    };

    const [total, pastas] = await Promise.all([
      this.prisma.client.pasta.count({ where }),
      this.prisma.client.pasta.findMany({
        where,
        take: ctx.limit,
        orderBy: { atualizadoEm: 'desc' },
        include: {
          processo: { select: { id: true, titulo: true } },
          _count: { select: { documentos: true } },
        },
      }),
    ]);

    const items = pastas
      .map((p): SearchResultItem => {
        const rank = textRank(ctx.q, p.nome);
        return {
          id: p.id,
          tipo: this.type,
          titulo: p.nome,
          subtitulo: p.processo?.titulo ?? 'Biblioteca geral',
          snippet: null,
          url: `/documentos?pastaId=${p.id}`,
          score: computeScore(rank, p.atualizadoEm),
          metadata: { totalDocumentos: p._count.documentos, processo: p.processo },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

@Injectable()
export class TagSearchAdapter implements SearchAdapter {
  readonly type = 'tags' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    // Tag não é sensível por si — mesmo racional permissivo de `ListTagsUseCase`
    // (Sprint 09), que só exige a permissão de leitura de documentos mínima.
    if (!resolveDocumentReadScope(ctx.user.permissions)) return emptyGroup(this.type);

    const where: Prisma.TagWhereInput = {
      escritorioId: ctx.escritorioId,
      nome: { contains: ctx.q, mode: 'insensitive' },
    };

    const [total, tags] = await Promise.all([
      this.prisma.client.tag.count({ where }),
      this.prisma.client.tag.findMany({ where, take: ctx.limit, orderBy: { nome: 'asc' } }),
    ]);

    const items = tags
      .map((t): SearchResultItem => {
        const rank = textRank(ctx.q, t.nome);
        return {
          id: t.id,
          tipo: this.type,
          titulo: t.nome,
          subtitulo: t.descricao,
          snippet: null,
          url: `/documentos?tagId=${t.id}`,
          score: computeScore(rank),
          metadata: { cor: t.cor },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

/**
 * Módulo Comments não existe ainda (Sprint 09 §0.5.6) — placeholder honesto,
 * mesmo padrão de "compartilhados" em Documents: nunca dado inventado.
 */
@Injectable()
export class CommentSearchAdapter implements SearchAdapter {
  readonly type = 'comments' as const;

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    void ctx;
    return { type: this.type, total: 0, items: [], disponivel: false };
  }
}

/**
 * Adicionado no Prompt 14 (Task Engine) — toda tarefa deve aparecer na
 * Busca Global automaticamente, respeitando Permission Engine + Scope
 * Resolver (`task-scope.ts`, mesmos helpers de `modules/tasks/`, nenhuma
 * regra de autorização duplicada).
 */
@Injectable()
export class TaskSearchAdapter implements SearchAdapter {
  readonly type = 'tasks' as const;
  constructor(private readonly prisma: PrismaService) {}

  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    const scope = resolveTaskReadScope(ctx.user.permissions);
    if (!scope) return emptyGroup(this.type);

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: ctx.user.membroId },
      select: { equipeId: true },
    });
    const teamMemberIds =
      scope === 'TEAM'
        ? await resolveTeamMemberIds(this.prisma, ctx.escritorioId, ctx.user.membroId)
        : [];
    const actor: TaskScopeActor = {
      membroId: ctx.user.membroId,
      teamMemberIds,
      equipeId: membro?.equipeId ?? null,
    };

    const where: Prisma.TarefaWhereInput = {
      escritorioId: ctx.escritorioId,
      excluidoEm: null,
      ...buildTaskScopeWhere(scope, actor),
      titulo: { contains: ctx.q, mode: 'insensitive' },
    };

    const [total, tarefas] = await Promise.all([
      this.prisma.client.tarefa.count({ where }),
      this.prisma.client.tarefa.findMany({
        where,
        take: ctx.limit,
        orderBy: { atualizadoEm: 'desc' },
      }),
    ]);

    const statusIds = [...new Set(tarefas.map((t) => t.statusId).filter((v): v is string => !!v))];
    const statusItens = statusIds.length
      ? await this.prisma.client.conjuntoValorItem.findMany({ where: { id: { in: statusIds } } })
      : [];
    const statusPorId = new Map(statusItens.map((s) => [s.id, s.valor]));

    const items = tarefas
      .map((t): SearchResultItem => {
        const rank = textRank(ctx.q, t.titulo);
        return {
          id: t.id,
          tipo: this.type,
          titulo: t.titulo,
          subtitulo: t.statusId ? (statusPorId.get(t.statusId) ?? null) : null,
          snippet: buildSnippet(t.descricao, ctx.q),
          url: `/tarefas/${t.id}`,
          score: computeScore(rank, t.atualizadoEm),
          metadata: {
            status: t.statusId ? statusPorId.get(t.statusId) : null,
            dataVencimento: t.dataVencimento,
            concluida: !!t.concluidaEm,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return { type: this.type, total, items };
  }
}

@Injectable()
export class PublicationSearchAdapter implements SearchAdapter {
  readonly type = 'publications' as const;
  constructor(private readonly prisma: PrismaService) {}
  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    if (!ctx.user.permissions.includes('publication:read')) return emptyGroup(this.type);
    const where: Prisma.PublicacaoJudicialCapturadaWhereInput = {
      escritorioId: ctx.escritorioId,
      OR: [
        { numeroCnj: { contains: ctx.q.replace(/\D/g, '') } },
        { tribunal: { contains: ctx.q, mode: 'insensitive' } },
        { tipoComunicacao: { contains: ctx.q, mode: 'insensitive' } },
        { conteudo: { contains: ctx.q, mode: 'insensitive' } },
        { processo: { titulo: { contains: ctx.q, mode: 'insensitive' } } },
        { processo: { cliente: { nome: { contains: ctx.q, mode: 'insensitive' } } } },
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.client.publicacaoJudicialCapturada.count({ where }),
      this.prisma.client.publicacaoJudicialCapturada.findMany({
        where,
        take: ctx.limit,
        orderBy: { dataPublicacao: 'desc' },
        include: { processo: { select: { titulo: true, cliente: { select: { nome: true } } } } },
      }),
    ]);
    return {
      type: this.type,
      total,
      items: rows.map((p) => ({
        id: p.id,
        tipo: this.type,
        titulo: p.tipoComunicacao ?? 'Publicação judicial',
        subtitulo: [p.numeroCnj, p.processo?.cliente.nome].filter(Boolean).join(' · '),
        snippet: buildSnippet(p.conteudo, ctx.q),
        url: `/publicacoes?publicacao=${p.id}`,
        score: computeScore(
          textRank(ctx.q, p.numeroCnj, [
            p.processo?.titulo ?? '',
            p.processo?.cliente.nome ?? '',
            p.tribunal ?? '',
            p.conteudo ?? '',
          ]),
          p.dataPublicacao ?? p.capturadoEm,
        ),
        metadata: {
          tribunal: p.tribunal,
          processo: p.processo?.titulo,
          dataPublicacao: p.dataPublicacao,
        },
      })),
    };
  }
}

@Injectable()
export class JudicialMovementSearchAdapter implements SearchAdapter {
  readonly type = 'judicial-movements' as const;
  constructor(private readonly prisma: PrismaService) {}
  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    if (!ctx.user.permissions.includes('movement:read')) return emptyGroup(this.type);
    const where: Prisma.MovimentoJudicialCapturadoWhereInput = {
      escritorioId: ctx.escritorioId,
      OR: [
        { numeroCnj: { contains: ctx.q.replace(/\D/g, '') } },
        { descricao: { contains: ctx.q, mode: 'insensitive' } },
        { tribunal: { contains: ctx.q, mode: 'insensitive' } },
        { tipo: { contains: ctx.q, mode: 'insensitive' } },
        { processo: { titulo: { contains: ctx.q, mode: 'insensitive' } } },
        { processo: { cliente: { nome: { contains: ctx.q, mode: 'insensitive' } } } },
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.client.movimentoJudicialCapturado.count({ where }),
      this.prisma.client.movimentoJudicialCapturado.findMany({
        where,
        take: ctx.limit,
        orderBy: { dataMovimento: 'desc' },
        include: { processo: { select: { titulo: true, cliente: { select: { nome: true } } } } },
      }),
    ]);
    return {
      type: this.type,
      total,
      items: rows.map((movement) => ({
        id: movement.id,
        tipo: this.type,
        titulo: movement.tipo || 'Movimentação judicial',
        subtitulo: [movement.numeroCnj, movement.processo?.cliente.nome]
          .filter(Boolean)
          .join(' · '),
        snippet: buildSnippet(movement.descricao, ctx.q),
        url: `/movimentacoes-judiciais?movimentacao=${movement.id}`,
        score: computeScore(
          textRank(ctx.q, movement.numeroCnj, [
            movement.descricao,
            movement.processo?.titulo ?? '',
            movement.processo?.cliente.nome ?? '',
            movement.tribunal ?? '',
            movement.tipo,
            movement.provider,
          ]),
          movement.dataMovimento,
        ),
        metadata: {
          tribunal: movement.tribunal,
          processo: movement.processo?.titulo,
          dataMovimento: movement.dataMovimento,
          origem: movement.provider,
        },
      })),
    };
  }
}

@Injectable()
export class ExtrajudicialMovementSearchAdapter implements SearchAdapter {
  readonly type = 'extrajudicial-movements' as const;
  constructor(private readonly prisma: PrismaService) {}
  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    if (!ctx.user.permissions.includes('extrajudicial-movement:read')) return emptyGroup(this.type);
    const where: Prisma.MovimentacaoExtrajudicialWhereInput = {
      escritorioId: ctx.escritorioId,
      excluidoEm: null,
      OR: [
        { descricao: { contains: ctx.q, mode: 'insensitive' } },
        { observacoes: { contains: ctx.q, mode: 'insensitive' } },
        { tipo: { contains: ctx.q, mode: 'insensitive' } },
        { origem: { contains: ctx.q, mode: 'insensitive' } },
        { cliente: { nome: { contains: ctx.q, mode: 'insensitive' } } },
        { processo: { titulo: { contains: ctx.q, mode: 'insensitive' } } },
        { responsavel: { nome: { contains: ctx.q, mode: 'insensitive' } } },
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.client.movimentacaoExtrajudicial.count({ where }),
      this.prisma.client.movimentacaoExtrajudicial.findMany({
        where,
        take: ctx.limit,
        orderBy: { dataMovimentacao: 'desc' },
        include: {
          cliente: { select: { nome: true } },
          processo: { select: { titulo: true } },
          responsavel: { select: { nome: true } },
        },
      }),
    ]);
    return {
      type: this.type,
      total,
      items: rows.map((m) => ({
        id: m.id,
        tipo: this.type,
        titulo: m.tipo,
        subtitulo: [m.cliente.nome, m.processo?.titulo].filter(Boolean).join(' · '),
        snippet: buildSnippet(m.descricao, ctx.q),
        url: `/movimentacoes-extrajudiciais?movimentacao=${m.id}`,
        score: computeScore(
          textRank(ctx.q, m.descricao, [
            m.cliente.nome,
            m.processo?.titulo ?? '',
            m.responsavel.nome,
            m.tipo,
            m.origem,
          ]),
          m.dataMovimentacao,
        ),
        metadata: {
          cliente: m.cliente.nome,
          processo: m.processo?.titulo,
          responsavel: m.responsavel.nome,
          origem: m.origem,
        },
      })),
    };
  }
}

@Injectable()
export class RequestSearchAdapter implements SearchAdapter {
  readonly type = 'requests' as const;
  constructor(private readonly prisma: PrismaService) {}
  async search(ctx: SearchContext): Promise<SearchGroupResult> {
    if (!ctx.user.permissions.includes('request:read')) return emptyGroup(this.type);
    const where: Prisma.PedidoWhereInput = { escritorioId: ctx.escritorioId, excluidoEm: null, OR: [{ descricao: { contains: ctx.q, mode: 'insensitive' } }, { categoria: { contains: ctx.q, mode: 'insensitive' } }, { pastaJuridica: { nome: { contains: ctx.q, mode: 'insensitive' } } }, { processo: { titulo: { contains: ctx.q, mode: 'insensitive' } } }] };
    const [total, rows] = await Promise.all([this.prisma.client.pedido.count({ where }), this.prisma.client.pedido.findMany({ where, take: ctx.limit, orderBy: { atualizadoEm: 'desc' }, include: { pastaJuridica: { select: { nome: true } }, processo: { select: { titulo: true } } } })]);
    return { type: this.type, total, items: rows.map((item) => ({ id: item.id, tipo: this.type, titulo: item.descricao, subtitulo: [item.pastaJuridica.nome, item.processo?.titulo, item.categoria].filter(Boolean).join(' · '), snippet: buildSnippet(item.anotacoes ?? item.descricao, ctx.q), url: `/pedidos/${item.id}`, score: computeScore(textRank(ctx.q, item.descricao, [item.pastaJuridica.nome, item.processo?.titulo ?? '', item.categoria]), item.atualizadoEm), metadata: { pasta: item.pastaJuridica.nome, processo: item.processo?.titulo, categoria: item.categoria, situacao: item.situacao } })) };
  }
}
