import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CreateLegalFolderDto,
  ListLegalFoldersQuery,
  UpdateLegalFolderDto,
} from '../presentation/schemas/legal-folder.schemas';
import { identifierPrefix, provisionLegalFolderDefaults } from './legal-folder-defaults';

@Injectable()
export class LegalFoldersService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(user: AuthUser): 'ALL' | 'TEAM' | 'ASSIGNED' | null {
    if (user.permissions.includes('legal-folder:read:all')) return 'ALL';
    if (user.permissions.includes('legal-folder:read:team')) return 'TEAM';
    if (user.permissions.includes('legal-folder:read:assigned')) return 'ASSIGNED';
    return null;
  }

  private async scopeWhere(user: AuthUser): Promise<Prisma.PastaJuridicaWhereInput> {
    const scope = this.scope(user);
    if (!scope) return { id: '00000000-0000-0000-0000-000000000000' };
    const confidentiality = user.permissions.includes('case:read:confidential')
      ? {}
      : { confidencial: false };
    if (scope === 'ALL') return confidentiality;
    if (scope === 'ASSIGNED') return { ...confidentiality, encarregadoId: user.membroId };
    const member = await this.prisma.client.membro.findFirst({
      where: { id: user.membroId, escritorioId: user.escritorioId },
      select: { equipeId: true },
    });
    if (!member?.equipeId) return { ...confidentiality, encarregadoId: user.membroId };
    const ids = (
      await this.prisma.client.membro.findMany({
        where: { escritorioId: user.escritorioId, equipeId: member.equipeId },
        select: { id: true },
      })
    ).map((item) => item.id);
    return { ...confidentiality, encarregadoId: { in: [user.membroId, ...ids] } };
  }

  async list(user: AuthUser, query: ListLegalFoldersQuery) {
    const scope = await this.scopeWhere(user);
    const text = query.q;
    const where: Prisma.PastaJuridicaWhereInput = {
      escritorioId: user.escritorioId,
      ...scope,
      AND: query.clienteId
        ? [
            {
              OR: [
                { clientePrincipalId: query.clienteId },
                { vinculosClientes: { some: { clienteId: query.clienteId, tipo: 'CLIENTE' } } },
              ],
            },
          ]
        : undefined,
      situacao: query.situacao,
      encarregadoId: query.encarregadoId,
      assunto: query.assunto ? { contains: query.assunto, mode: 'insensitive' } : undefined,
      categoria: query.categoria ? { contains: query.categoria, mode: 'insensitive' } : undefined,
      parteContrariaPrincipal: query.parteContraria
        ? { nome: { contains: query.parteContraria, mode: 'insensitive' } }
        : undefined,
      processos:
        query.processo || query.cnj || query.possuiProcesso !== undefined
          ? query.possuiProcesso === false
            ? { none: {} }
            : {
                some: {
                  processo: {
                    titulo: query.processo
                      ? { contains: query.processo, mode: 'insensitive' }
                      : undefined,
                    numeroCnj: query.cnj ? { contains: query.cnj } : undefined,
                  },
                },
              }
          : undefined,
      configuracoesCaptura:
        query.possuiCaptura === undefined
          ? undefined
          : query.possuiCaptura
            ? { some: {} }
            : { none: {} },
      criadoEm:
        query.criadoDe || query.criadoAte
          ? {
              gte: query.criadoDe ? new Date(query.criadoDe) : undefined,
              lte: query.criadoAte ? new Date(query.criadoAte) : undefined,
            }
          : undefined,
      OR: text
        ? [
            { nome: { contains: text, mode: 'insensitive' } },
            { numeroInterno: { contains: text, mode: 'insensitive' } },
            { assunto: { contains: text, mode: 'insensitive' } },
            { categoria: { contains: text, mode: 'insensitive' } },
            { clientePrincipal: { nome: { contains: text, mode: 'insensitive' } } },
            { parteContrariaPrincipal: { nome: { contains: text, mode: 'insensitive' } } },
            {
              processos: {
                some: { processo: { titulo: { contains: text, mode: 'insensitive' } } },
              },
            },
            { processos: { some: { processo: { numeroCnj: { contains: text } } } } },
          ]
        : undefined,
    };
    const orderBy = query.sort.startsWith('-')
      ? { [query.sort.slice(1)]: 'desc' as const }
      : { [query.sort]: 'asc' as const };
    const [items, total] = await Promise.all([
      this.prisma.client.pastaJuridica.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          clientePrincipal: { select: { id: true, nome: true } },
          parteContrariaPrincipal: { select: { id: true, nome: true } },
          processos: {
            select: {
              processo: { select: { id: true, titulo: true, numeroCnj: true, tipo: true } },
            },
          },
          _count: { select: { processos: true, configuracoesCaptura: true } },
          vinculosClientes: { include: { cliente: { select: { id: true, nome: true } } } },
        },
      }),
      this.prisma.client.pastaJuridica.count({ where }),
    ]);
    return { items: await this.withMembers(items), total, page: query.page, limit: query.limit };
  }

  async get(user: AuthUser, id: string) {
    const item = await this.prisma.client.pastaJuridica.findFirst({
      where: { id, escritorioId: user.escritorioId, ...(await this.scopeWhere(user)) },
      include: {
        clientePrincipal: { select: { id: true, nome: true } },
        parteContrariaPrincipal: { select: { id: true, nome: true } },
        processos: {
          select: {
            processo: {
              select: {
                id: true,
                titulo: true,
                numeroCnj: true,
                tipo: true,
                assunto: true,
                status: true,
                configuracoesCaptura: {
                  select: {
                    id: true,
                    numeroCnj: true,
                    status: true,
                    ultimaSincronizacaoEm: true,
                    novidadesUltimaCaptura: true,
                  },
                },
                publicacoesCapturadas: {
                  select: { id: true, dataPublicacao: true, conteudo: true },
                  orderBy: { dataPublicacao: 'desc' },
                  take: 10,
                },
                movimentosCapturados: {
                  select: { id: true, dataMovimento: true, tipo: true, descricao: true },
                  orderBy: { dataMovimento: 'desc' },
                  take: 10,
                },
                documentos: {
                  select: { id: true, nome: true, extensao: true, atualizadoEm: true },
                  orderBy: { atualizadoEm: 'desc' },
                  take: 10,
                },
                partes: {
                  where: { excluidoEm: null },
                  select: {
                    id: true,
                    nome: true,
                    tipo: true,
                    natureza: true,
                    ehNossoCliente: true,
                    clienteId: true,
                  },
                },
                equipe: {
                  where: { saiuEm: null },
                  select: { membroId: true, funcaoNoProcesso: true, responsavelPrincipal: true },
                },
              },
            },
          },
        },
        configuracoesCaptura: {
          select: {
            id: true,
            numeroCnj: true,
            status: true,
            ultimaSincronizacaoEm: true,
            novidadesUltimaCaptura: true,
          },
        },
        vinculosClientes: { include: { cliente: { select: { id: true, nome: true } } } },
      },
    });
    if (!item) throw new NotFoundException('Pasta Jurídica não encontrada.');
    return (await this.withMembers([item]))[0];
  }

  async create(user: AuthUser, input: CreateLegalFolderDto) {
    await this.validateInput(user.escritorioId, input, true);
    return this.prisma.client.$transaction(async (tx) => {
      const identifierClient = await tx.cliente.findFirst({
        where: { id: input.clientePrincipalId, escritorioId: user.escritorioId },
        select: { nome: true },
      });
      if (!identifierClient) throw new BadRequestException('Cliente do Identificador inválido.');
      const prefixo = identifierPrefix(identifierClient.nome);
      if (!prefixo)
        throw new BadRequestException('O Cliente não possui nome válido para o Identificador.');
      await tx.prefixoPastaJuridica.upsert({
        where: { escritorioId_prefixo: { escritorioId: user.escritorioId, prefixo } },
        create: { escritorioId: user.escritorioId, prefixo, nome: identifierClient.nome },
        update: {},
      });
      const rows = await tx.$queryRaw<Array<{ numero: number }>>(Prisma.sql`
        UPDATE "prefixos_pasta_juridica"
        SET "proximo_numero" = "proximo_numero" + 1, "atualizado_em" = CURRENT_TIMESTAMP
        WHERE "escritorio_id" = ${user.escritorioId}::uuid AND "prefixo" = ${prefixo} AND "ativo" = true
        RETURNING "proximo_numero" - 1 AS "numero"
      `);
      if (!rows[0]) throw new BadRequestException('Prefixo de Pasta invÃ¡lido ou inativo.');
      const sequencial = rows[0].numero;
      const nome = `${prefixo}/${sequencial}`;
      return tx.pastaJuridica.create({
        data: {
          escritorioId: user.escritorioId,
          nome,
          numeroInterno: nome,
          prefixo,
          sequencial,
          etapa: 'CADASTRAMENTO',
          assunto: input.assunto,
          categoria: input.categoria,
          situacao: input.situacao,
          confidencial: input.confidencial,
          clientePrincipalId: input.clientePrincipalId,
          parteContrariaPrincipalId: input.parteContrariaPrincipalId,
          encarregadoId: input.encarregadoId,
          observacoes: input.observacoes,
          dataConclusao: input.dataConclusao ? new Date(input.dataConclusao) : undefined,
          camposExtrasValores: input.camposExtrasValores,
          processos: { create: input.processoIds.map((processoId) => ({ processoId })) },
          vinculosClientes: { create: this.clientLinks(input) },
        },
        select: { id: true, nome: true },
      });
    });
  }

  async update(user: AuthUser, id: string, input: UpdateLegalFolderDto) {
    await this.get(user, id);
    await this.validateInput(user.escritorioId, input, false);
    const {
      processoIds,
      outrosClienteIds,
      outrasPartesContrariasIds,
      interessadoIds,
      dataConclusao,
      ...data
    } = input;
    await this.prisma.client.$transaction(async (tx) => {
      await tx.pastaJuridica.update({
        where: { id },
        data: {
          ...data,
          dataConclusao:
            dataConclusao === undefined
              ? undefined
              : dataConclusao
                ? new Date(dataConclusao)
                : null,
        },
      });
      if (processoIds) {
        await tx.$queryRaw(Prisma.sql`
          SELECT "id" FROM "pastas_juridicas"
          WHERE "id" = ${id}::uuid AND "escritorio_id" = ${user.escritorioId}::uuid
          FOR UPDATE
        `);
        await tx.pastaJuridicaProcesso.deleteMany({ where: { pastaJuridicaId: id } });
        if (processoIds.length)
          await tx.pastaJuridicaProcesso.createMany({
            data: processoIds.map((processoId) => ({ pastaJuridicaId: id, processoId })),
          });
      }
      if (outrosClienteIds || outrasPartesContrariasIds || interessadoIds) {
        await tx.pastaJuridicaCliente.deleteMany({ where: { pastaJuridicaId: id } });
        const links = this.clientLinks({
          outrosClienteIds: outrosClienteIds ?? [],
          outrasPartesContrariasIds: outrasPartesContrariasIds ?? [],
          interessadoIds: interessadoIds ?? [],
        });
        if (links.length)
          await tx.pastaJuridicaCliente.createMany({
            data: links.map((link) => ({ pastaJuridicaId: id, ...link })),
          });
      }
    });
    return { id };
  }

  async options(escritorioId: string) {
    await this.prisma.client.$transaction((tx) => provisionLegalFolderDefaults(tx, escritorioId));
    const [opcoes, camposExtras] = await Promise.all([
      this.prisma.client.opcaoPastaJuridica.findMany({
        where: { escritorioId, ativo: true },
        select: { tipo: true, valor: true, label: true },
        orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }],
      }),
      this.prisma.client.campoExtra.findMany({
        where: { escritorioId, entidade: 'PASTA_JURIDICA', ativo: true, excluidoEm: null },
        orderBy: { ordem: 'asc' },
      }),
    ]);
    return {
      categorias: opcoes.filter((item) => item.tipo === 'CATEGORIA'),
      situacoes: opcoes.filter((item) => item.tipo === 'SITUACAO'),
      etapaInicial: 'CADASTRAMENTO',
      camposExtras,
    };
  }

  private clientLinks(input: {
    outrosClienteIds?: string[];
    outrasPartesContrariasIds?: string[];
    interessadoIds?: string[];
  }) {
    return [
      ...(input.outrosClienteIds ?? []).map((clienteId) => ({
        clienteId,
        tipo: 'CLIENTE' as const,
      })),
      ...(input.outrasPartesContrariasIds ?? []).map((clienteId) => ({
        clienteId,
        tipo: 'PARTE_CONTRARIA' as const,
      })),
      ...(input.interessadoIds ?? []).map((clienteId) => ({
        clienteId,
        tipo: 'INTERESSADO' as const,
      })),
    ];
  }

  async archive(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.prisma.client.pastaJuridica.update({
      where: { id },
      data: { arquivadoEm: new Date() },
    });
  }

  async complete(user: AuthUser, id: string) {
    const folder = await this.get(user, id);
    if (folder.dataConclusao) return { id, dataConclusao: folder.dataConclusao };
    const dataConclusao = new Date();
    await this.prisma.client.pastaJuridica.update({
      where: { id },
      data: { dataConclusao },
    });
    return { id, dataConclusao };
  }

  async copy(user: AuthUser, id: string) {
    const folder = await this.get(user, id);
    if (!folder.assunto || !folder.categoria)
      throw new BadRequestException(
        'Complete Assunto e Categoria antes de copiar esta Pasta legada.',
      );
    const links = folder.vinculosClientes ?? [];
    return this.create(user, {
      assunto: folder.assunto,
      categoria: folder.categoria,
      situacao: folder.situacao as CreateLegalFolderDto['situacao'],
      confidencial: folder.confidencial,
      clientePrincipalId: folder.clientePrincipal.id,
      parteContrariaPrincipalId: folder.parteContrariaPrincipal?.id ?? null,
      encarregadoId: folder.encarregadoId,
      observacoes: folder.observacoes,
      dataConclusao: null,
      processoIds: [],
      outrosClienteIds: links
        .filter((link) => link.tipo === 'CLIENTE')
        .map((link) => link.cliente.id),
      outrasPartesContrariasIds: links
        .filter((link) => link.tipo === 'PARTE_CONTRARIA')
        .map((link) => link.cliente.id),
      interessadoIds: links
        .filter((link) => link.tipo === 'INTERESSADO')
        .map((link) => link.cliente.id),
      camposExtrasValores: folder.camposExtrasValores as Record<string, string>,
    });
  }

  private async validateInput(
    escritorioId: string,
    input: Partial<CreateLegalFolderDto> | UpdateLegalFolderDto,
    enforceRequired: boolean,
  ) {
    const ids = [
      input.clientePrincipalId,
      input.parteContrariaPrincipalId,
      ...(input.outrosClienteIds ?? []),
      ...(input.outrasPartesContrariasIds ?? []),
      ...(input.interessadoIds ?? []),
    ].filter(Boolean) as string[];
    if (ids.length) {
      const count = await this.prisma.client.cliente.count({
        where: { escritorioId, id: { in: ids } },
      });
      if (count !== new Set(ids).size)
        throw new BadRequestException('Cliente relacionado inválido.');
    }
    if (input.encarregadoId) {
      const member = await this.prisma.client.membro.findFirst({
        where: { id: input.encarregadoId, escritorioId },
        select: { id: true },
      });
      if (!member) throw new BadRequestException('Encarregado inválido.');
    }
    if (input.processoIds?.length) {
      const relatedProcesses = await this.prisma.client.processo.findMany({
        where: { escritorioId, id: { in: input.processoIds } },
        select: { id: true, tipo: true },
      });
      if (relatedProcesses.length !== new Set(input.processoIds).size)
        throw new BadRequestException('Processo relacionado inválido.');
      const byType = new Map<string, number>();
      for (const process of relatedProcesses)
        byType.set(process.tipo, (byType.get(process.tipo) ?? 0) + 1);
      if ((byType.get('JUDICIAL') ?? 0) > 1)
        throw new BadRequestException(
          'Esta Pasta já possui um Processo Judicial. Para cadastrar outro Processo Judicial para este cliente, crie uma nova Pasta.',
        );
      if ((byType.get('EXTRAJUDICIAL') ?? 0) > 1)
        throw new BadRequestException(
          'Esta Pasta já possui um Processo Extrajudicial. Para cadastrar outro Processo Extrajudicial para este cliente, crie uma nova Pasta.',
        );
    }
    if (enforceRequired && input.categoria && input.situacao) {
      const count = await this.prisma.client.opcaoPastaJuridica.count({
        where: {
          escritorioId,
          ativo: true,
          OR: [
            { tipo: 'CATEGORIA', valor: input.categoria },
            { tipo: 'SITUACAO', valor: input.situacao },
          ],
        },
      });
      if (count !== 2)
        throw new BadRequestException('Categoria ou SituaÃ§Ã£o invÃ¡lida para este escritÃ³rio.');
    }
    const required = enforceRequired
      ? await this.prisma.client.campoObrigatorio.findMany({
          where: { escritorioId, entidade: 'PASTA_JURIDICA', obrigatorio: true },
          select: { campo: true },
        })
      : [];
    for (const field of required) {
      if (!input[field.campo as keyof typeof input])
        throw new BadRequestException(`Campo obrigatório não informado: ${field.campo}.`);
    }
    const extraFields = await this.prisma.client.campoExtra.findMany({
      where: { escritorioId, entidade: 'PASTA_JURIDICA', ativo: true, excluidoEm: null },
      select: { chave: true, nome: true, tipo: true, obrigatorio: true, opcoes: true },
    });
    for (const field of extraFields) {
      const value = input.camposExtrasValores?.[field.chave];
      if (enforceRequired && field.obrigatorio && !value)
        throw new BadRequestException(`Campo obrigatÃ³rio nÃ£o informado: ${field.nome}.`);
      if (!value) continue;
      if (field.tipo === 'NUMERO' && !/^-?\d+$/.test(value))
        throw new BadRequestException(`${field.nome} deve ser um nÃºmero inteiro.`);
      if (field.tipo === 'DATA' && !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new BadRequestException(`${field.nome} deve ser uma data vÃ¡lida.`);
      if (field.tipo === 'SELECT' && field.opcoes.length && !field.opcoes.includes(value))
        throw new BadRequestException(`Valor invÃ¡lido para ${field.nome}.`);
      if (field.chave === 'outras_anotacoes' && value.length > 10000)
        throw new BadRequestException(
          'Outras AnotaÃ§Ãµes deve possuir no mÃ¡ximo 10.000 caracteres.',
        );
    }
  }

  private async withMembers<T extends { encarregadoId: string }>(items: T[]) {
    const ids = [...new Set(items.map((item) => item.encarregadoId))];
    const members = await this.prisma.client.membro.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true, numeroOab: true, cargo: true },
    });
    const map = new Map(members.map((member) => [member.id, member]));
    return items.map((item) => ({ ...item, encarregado: map.get(item.encarregadoId) ?? null }));
  }
}
