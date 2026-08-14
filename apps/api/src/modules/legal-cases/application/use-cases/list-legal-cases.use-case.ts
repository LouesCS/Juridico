import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
} from '../case-scope';
import { ListLegalCasesQuery } from '../../presentation/schemas/legal-case.schemas';

/** Reafirma docs/api/09-legal-cases.md §9.1 (`GET /v1/legal-cases`, `ProcessoResumoDTO`). */
@Injectable()
export class ListLegalCasesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser, query: ListLegalCasesQuery) {
    const scope = resolveCaseReadScope(user.permissions);
    if (!scope) return { items: [], nextCursor: null, total: 0 };

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: user.membroId },
      select: { equipeId: true },
    });
    const teamMemberIds = membro?.equipeId
      ? (
          await this.prisma.client.membro.findMany({
            where: { equipeId: membro.equipeId, escritorioId },
            select: { id: true },
          })
        ).map((m) => m.id)
      : [];

    const meusApenasFilter: Prisma.ProcessoWhereInput = query.meusApenas
      ? {
          OR: [
            { responsavelPrincipalId: user.membroId },
            { equipe: { some: { membroId: user.membroId } } },
          ],
        }
      : {};

    const where: Prisma.ProcessoWhereInput = {
      escritorioId,
      ...buildCaseScopeWhere(scope, { membroId: user.membroId, teamMemberIds }),
      ...applyConfidentialityFilter(user.permissions),
      ...(query.status ? { status: query.status } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.pastaJuridicaId
        ? { pastasJuridicas: { some: { pastaJuridicaId: query.pastaJuridicaId } } }
        : {}),
      ...(query.responsavelId ? { responsavelPrincipalId: query.responsavelId } : {}),
      ...(query.clienteId ? { clienteId: query.clienteId } : {}),
      ...(query.area ? { area: { equals: query.area, mode: 'insensitive' } } : {}),
      ...(query.tribunal ? { tribunal: { equals: query.tribunal, mode: 'insensitive' } } : {}),
      ...(query.prioridade ? { prioridade: query.prioridade } : {}),
      ...(query.dataDistribuicaoDe || query.dataDistribuicaoAte
        ? {
            dataDistribuicao: {
              ...(query.dataDistribuicaoDe ? { gte: new Date(query.dataDistribuicaoDe) } : {}),
              ...(query.dataDistribuicaoAte ? { lte: new Date(query.dataDistribuicaoAte) } : {}),
            },
          }
        : {}),
      ...(query.dataEncerramentoDe || query.dataEncerramentoAte
        ? {
            dataEncerramento: {
              ...(query.dataEncerramentoDe ? { gte: new Date(query.dataEncerramentoDe) } : {}),
              ...(query.dataEncerramentoAte ? { lte: new Date(query.dataEncerramentoAte) } : {}),
            },
          }
        : {}),
      ...(query.protocolo
        ? { numeroInterno: { contains: query.protocolo, mode: 'insensitive' } }
        : {}),
      ...(query.parteId ? { partes: { some: { id: query.parteId } } } : {}),
      ...(query.parteContrariaId
        ? { partes: { some: { id: query.parteContrariaId, tipo: 'REU' } } }
        : {}),
      ...(query.encarregadoId
        ? {
            pastasJuridicas: {
              some: { pastaJuridica: { encarregadoId: query.encarregadoId } },
            },
          }
        : {}),
      ...(query.semMovimentacoesApos
        ? {
            movimentacoesExtrajudiciais: {
              none: {
                excluidoEm: null,
                dataMovimentacao: {
                  gt: new Date(`${query.semMovimentacoesApos}T23:59:59.999Z`),
                },
              },
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { titulo: { contains: query.q, mode: 'insensitive' } },
              { numeroInterno: { contains: query.q, mode: 'insensitive' } },
              { numeroCnj: { contains: query.q.replace(/\D/g, '') } },
              { cliente: { nome: { contains: query.q, mode: 'insensitive' } } },
              { partes: { some: { nome: { contains: query.q, mode: 'insensitive' } } } },
              {
                pastasJuridicas: {
                  some: { pastaJuridica: { nome: { contains: query.q, mode: 'insensitive' } } },
                },
              },
            ],
          }
        : {}),
      ...meusApenasFilter,
    };

    const orderBy: Prisma.ProcessoOrderByWithRelationInput = query.sort.startsWith('-')
      ? { [query.sort.slice(1)]: 'desc' }
      : { [query.sort]: 'asc' };

    const [processos, total] = await Promise.all([
      this.prisma.client.processo.findMany({
        where,
        orderBy,
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: {
          cliente: { select: { nome: true } },
          pastasJuridicas: {
            select: {
              pastaJuridica: {
                select: {
                  id: true,
                  nome: true,
                  encarregadoId: true,
                  clientePrincipal: { select: { id: true, nome: true } },
                  parteContrariaPrincipal: { select: { id: true, nome: true } },
                },
              },
            },
            take: 1,
          },
          // Somente o titular formal de cada papel (`principal: true`) —
          // nunca a primeira linha encontrada, que seria uma escolha
          // arbitrária (achado real desta auditoria: o código anterior não
          // filtrava por `principal` nem por `excluidoEm`).
          partes: {
            where: {
              tipo: { in: ['AUTOR', 'REU', 'ADVOGADO_AUTOR', 'ADVOGADO_REU'] },
              principal: true,
              excluidoEm: null,
            },
            select: { id: true, tipo: true, nome: true, clienteId: true },
          },
        },
      }),
      this.prisma.client.processo.count({ where }),
    ]);

    const hasMore = processos.length > query.limit;
    const pagina = hasMore ? processos.slice(0, query.limit) : processos;

    const responsavelIds = [...new Set(pagina.map((p) => p.responsavelPrincipalId))];
    const encarregadoIds = [
      ...new Set(
        pagina
          .map((p) => p.pastasJuridicas?.[0]?.pastaJuridica.encarregadoId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const responsaveis = responsavelIds.length
      ? await this.prisma.client.membro.findMany({
          where: { id: { in: responsavelIds } },
          include: { usuario: true },
        })
      : [];
    const responsavelPorId = new Map(responsaveis.map((m) => [m.id, m]));
    const encarregados = encarregadoIds.length
      ? await this.prisma.client.membro.findMany({
          where: { id: { in: encarregadoIds }, escritorioId },
          include: { usuario: true },
        })
      : [];
    const encarregadoPorId = new Map(encarregados.map((m) => [m.id, m]));

    // `Processo.proximaDataRelevante` nunca é escrita por nenhum use case
    // (mesmo achado de `get-legal-case.use-case.ts`) — uma única query
    // busca os prazos pendentes da página inteira, e o primeiro por
    // processo (já ordenado por vencimento) vence.
    const prazosPendentes = pagina.length
      ? await this.prisma.client.prazo.findMany({
          where: { processoId: { in: pagina.map((p) => p.id) }, status: 'PENDENTE' },
          orderBy: { dataVencimento: 'asc' },
          select: { processoId: true, dataVencimento: true },
        })
      : [];
    const proximoPrazoPorProcesso = new Map<string, Date>();
    for (const prazo of prazosPendentes) {
      if (!proximoPrazoPorProcesso.has(prazo.processoId)) {
        proximoPrazoPorProcesso.set(prazo.processoId, prazo.dataVencimento);
      }
    }

    return {
      items: pagina.map((p) => {
        const responsavel = responsavelPorId.get(p.responsavelPrincipalId);
        return {
          id: p.id,
          titulo: p.titulo,
          numeroInterno: p.numeroInterno,
          numeroCnj: p.numeroCnj,
          status: p.status,
          prioridade: p.prioridade,
          area: p.area,
          tribunal: p.tribunal,
          comarca: p.comarca,
          vara: p.vara,
          instancia: p.instancia,
          tipoAcao: p.tipoAcao,
          poloCliente: p.poloCliente,
          dataDistribuicao: p.dataDistribuicao,
          dataEncerramento: p.dataEncerramento,
          segredoJustica: p.segredoJustica,
          cliente: { id: p.clienteId, nome: p.cliente.nome },
          pastaJuridica: p.pastasJuridicas?.[0]?.pastaJuridica
            ? {
                ...p.pastasJuridicas[0].pastaJuridica,
                encarregado: encarregadoPorId.get(p.pastasJuridicas[0].pastaJuridica.encarregadoId)
                  ? {
                      id: p.pastasJuridicas[0].pastaJuridica.encarregadoId,
                      usuario: {
                        nome:
                          encarregadoPorId.get(p.pastasJuridicas[0].pastaJuridica.encarregadoId)
                            ?.usuario?.nome ?? '',
                      },
                    }
                  : null,
              }
            : null,
          autorPrincipal: p.partes?.find((parte) => parte.tipo === 'AUTOR') ?? null,
          reuPrincipal: p.partes?.find((parte) => parte.tipo === 'REU') ?? null,
          advogadoPrincipalAutor:
            p.partes?.find((parte) => parte.tipo === 'ADVOGADO_AUTOR') ?? null,
          advogadoPrincipalReu: p.partes?.find((parte) => parte.tipo === 'ADVOGADO_REU') ?? null,
          responsavel: responsavel
            ? {
                id: responsavel.id,
                nome: responsavel.usuario?.nome,
                avatarUrl: responsavel.usuario?.avatarUrl,
              }
            : null,
          proximaDataRelevante: proximoPrazoPorProcesso.get(p.id) ?? null,
          ultimaAtualizacaoEm: p.ultimaAtualizacaoEm,
          versao: p.versao,
        };
      }),
      nextCursor: hasMore ? pagina[pagina.length - 1].id : null,
      total,
    };
  }

  async listPartyOptions(
    escritorioId: string,
    user: AuthUser,
    query: { q: string; tipo: 'TODAS' | 'REU'; cursor?: string; limit: number },
  ) {
    const scope = resolveCaseReadScope(user.permissions);
    if (!scope) return { items: [], nextCursor: null };
    const member = await this.prisma.client.membro.findFirst({
      where: { id: user.membroId, escritorioId },
      select: { equipeId: true },
    });
    const teamMemberIds = member?.equipeId
      ? (
          await this.prisma.client.membro.findMany({
            where: { equipeId: member.equipeId, escritorioId },
            select: { id: true },
          })
        ).map((item) => item.id)
      : [];
    const items = await this.prisma.client.parteProcesso.findMany({
      where: {
        escritorioId,
        excluidoEm: null,
        ...(query.tipo === 'REU' ? { tipo: 'REU' as const } : {}),
        ...(query.q ? { nome: { contains: query.q, mode: 'insensitive' as const } } : {}),
        processo: {
          tipo: 'EXTRAJUDICIAL',
          ...buildCaseScopeWhere(scope, { membroId: user.membroId, teamMemberIds }),
          ...applyConfidentialityFilter(user.permissions),
        },
      },
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, nome: true, tipo: true, documento: true },
    });
    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }
}
