import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { formatCnj, isValidCnj, normalizeCnj } from '../../legal-cases/domain/cnj';
import { TimelineRecorderService } from '../../timeline/application/timeline-recorder.service';
import { resolveCaseReadScope } from '../../legal-cases/application/case-scope';
import { DataJudProvider } from '../infrastructure/datajud.provider';
import {
  CreateCaptureDto,
  ListCaptureQuery,
  UpdateCaptureDto,
} from '../presentation/schemas/judicial-capture.schemas';

const PUBLIC_PROVIDER_ERROR = 'Não foi possível consultar a fonte judicial no momento.';

@Injectable()
export class JudicialCaptureService {
  private readonly logger = new Logger(JudicialCaptureService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataJud: DataJudProvider,
    private readonly timeline: TimelineRecorderService,
  ) {}

  private assertCnj(value: string) {
    if (!isValidCnj(value)) throw new BadRequestException('Número CNJ inválido.');
    return normalizeCnj(value);
  }

  async list(escritorioId: string, query: ListCaptureQuery, user: AuthUser) {
    const orderBy: Record<string, 'asc' | 'desc'> = query.sort.startsWith('-')
      ? { [query.sort.slice(1)]: 'desc' }
      : { [query.sort]: 'asc' };
    const normalizedSearch = query.q ? normalizeCnj(query.q) : '';
    const where: Prisma.ConfiguracaoCapturaWhereInput = {
      escritorioId,
      OR: query.q
        ? [
            ...(normalizedSearch
              ? [{ numeroCnjSomenteDigitos: { contains: normalizedSearch } }]
              : []),
            { numeroCnj: { contains: query.q, mode: 'insensitive' } },
            { processo: { titulo: { contains: query.q, mode: 'insensitive' } } },
            { processo: { numeroInterno: { contains: query.q, mode: 'insensitive' } } },
            { processo: { cliente: { nome: { contains: query.q, mode: 'insensitive' } } } },
          ]
        : undefined,
      numeroCnjSomenteDigitos: query.cnj ? { contains: normalizeCnj(query.cnj) } : undefined,
      status: query.status?.length ? { in: query.status } : undefined,
      capturaAtiva: query.ativa,
      criadoEm:
        query.criadoDe || query.criadoAte
          ? {
              gte: query.criadoDe ? new Date(query.criadoDe) : undefined,
              lte: query.criadoAte ? new Date(query.criadoAte) : undefined,
            }
          : undefined,
      atualizadoEm:
        query.atualizadoDe || query.atualizadoAte
          ? {
              gte: query.atualizadoDe ? new Date(query.atualizadoDe) : undefined,
              lte: query.atualizadoAte ? new Date(query.atualizadoAte) : undefined,
            }
          : undefined,
      processo:
        query.processo || query.cliente || query.pastaJuridicaId
          ? {
              titulo: query.processo
                ? { contains: query.processo, mode: 'insensitive' }
                : undefined,
              cliente: query.cliente
                ? { nome: { contains: query.cliente, mode: 'insensitive' } }
                : undefined,
              pastasJuridicas: query.pastaJuridicaId
                ? { some: { pastaJuridicaId: query.pastaJuridicaId } }
                : undefined,
            }
          : undefined,
      pastaJuridicaId: query.pastaJuridicaId,
      ultimaSincronizacaoEm:
        query.ultimaSincronizacaoDe || query.ultimaSincronizacaoAte
          ? {
              gte: query.ultimaSincronizacaoDe ? new Date(query.ultimaSincronizacaoDe) : undefined,
              lte: query.ultimaSincronizacaoAte
                ? new Date(query.ultimaSincronizacaoAte)
                : undefined,
            }
          : undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.client.configuracaoCaptura.findMany({
        where,
        include: {
          pastaJuridica: {
            select: { id: true, nome: true, encarregadoId: true, confidencial: true },
          },
          processo: {
            select: {
              id: true,
              titulo: true,
              numeroCnj: true,
              numeroInterno: true,
              assunto: true,
              segredoJustica: true,
              responsavelPrincipalId: true,
              equipe: { select: { membroId: true }, where: { saiuEm: null } },
              cliente: { select: { id: true, nome: true } },
              partes: {
                where: { ehNossoCliente: false, excluidoEm: null },
                select: { id: true, nome: true, natureza: true, ehNossoCliente: true },
                take: 10,
              },
              pastasJuridicas: {
                select: {
                  pastaJuridica: {
                    select: { id: true, nome: true, encarregadoId: true, confidencial: true },
                  },
                },
              },
            },
          },
        },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.client.configuracaoCaptura.count({ where }),
    ]);
    const caseScope = resolveCaseReadScope(user.permissions);
    let teamMemberIds: string[] = [];
    if (caseScope === 'TEAM') {
      const member = await this.prisma.client.membro.findFirst({
        where: { id: user.membroId, escritorioId },
        select: { equipeId: true },
      });
      if (member?.equipeId) {
        teamMemberIds = (
          await this.prisma.client.membro.findMany({
            where: { escritorioId, equipeId: member.equipeId },
            select: { id: true },
          })
        ).map((item) => item.id);
      }
    }
    const visibleItems = items.map((item) => {
      const process = item.processo;
      if (!process) return { ...item, processo: null, pasta: null };
      const canReadConfidential = user.permissions.includes('case:read:confidential');
      const legalFolderScope = user.permissions.includes('legal-folder:read:all')
        ? 'ALL'
        : user.permissions.includes('legal-folder:read:team')
          ? 'TEAM'
          : user.permissions.includes('legal-folder:read:assigned')
            ? 'ASSIGNED'
            : null;
      const mayReadLegalFolder = (folder: { encarregadoId: string; confidencial: boolean }) =>
        Boolean(
          legalFolderScope &&
          (!folder.confidencial || canReadConfidential) &&
          (legalFolderScope === 'ALL' ||
            folder.encarregadoId === user.membroId ||
            (legalFolderScope === 'TEAM' && teamMemberIds.includes(folder.encarregadoId))),
        );
      const pastas = process.pastasJuridicas
        .map(({ pastaJuridica }) => pastaJuridica)
        .filter(mayReadLegalFolder);
      const folderView = (folder: { id: string; nome: string }) => ({
        id: folder.id,
        nome: folder.nome,
      });
      const safeProcess = {
        id: process.id,
        titulo: process.titulo,
        numeroCnj: process.numeroCnj,
        numeroInterno: process.numeroInterno,
        assunto: process.assunto,
        cliente: process.cliente,
        partes: process.partes,
        pastasJuridicas: pastas.map((pasta) => ({ pastaJuridica: folderView(pasta) })),
      };
      return {
        ...item,
        processo: safeProcess,
        pasta:
          item.pastaJuridica && mayReadLegalFolder(item.pastaJuridica)
            ? folderView(item.pastaJuridica)
            : pastas.length === 1
              ? folderView(pastas[0])
              : null,
      };
    });
    return { items: visibleItems, total, page: query.page, limit: query.limit };
  }

  async get(escritorioId: string, id: string) {
    const item = await this.prisma.client.configuracaoCaptura.findFirst({
      where: { id, escritorioId },
      include: {
        pastaJuridica: { select: { id: true, nome: true } },
        processo: {
          select: {
            id: true,
            titulo: true,
            cliente: { select: { id: true, nome: true } },
            pastasJuridicas: { select: { pastaJuridica: { select: { id: true, nome: true } } } },
          },
        },
        historicos: { orderBy: { criadoEm: 'desc' }, take: 20 },
      },
    });
    if (!item) throw new NotFoundException('Configuração de captura não encontrada.');
    return item;
  }

  async verify(escritorioId: string, numeroCnj: string) {
    const digits = this.assertCnj(numeroCnj);
    const processo = await this.prisma.client.processo.findFirst({
      where: { escritorioId, numeroCnj: formatCnj(digits), excluidoEm: null },
      select: {
        id: true,
        titulo: true,
        cliente: { select: { id: true, nome: true } },
        pastasJuridicas: {
          select: { pastaJuridica: { select: { id: true, nome: true } } },
          take: 2,
        },
      },
    });
    const external = await this.dataJud.findProcess(digits);
    return {
      found: Boolean(external),
      process: external
        ? {
            numeroCnj: formatCnj(external.cnj),
            tribunal: external.court,
            orgaoJulgador: external.judgingBody,
            classe: external.proceduralClass,
            ultimaMovimentacao: external.lastMovementAt,
          }
        : null,
      processoRelacionado: processo,
    };
  }

  async create(escritorioId: string, input: CreateCaptureDto) {
    const digits = this.assertCnj(input.numeroCnj);
    const existing = await this.prisma.client.configuracaoCaptura.findFirst({
      where: { escritorioId, numeroCnjSomenteDigitos: digits },
    });
    if (existing) throw new ConflictException('Este número CNJ já possui configuração de captura.');
    let processoId = input.processoId ?? null;
    if (processoId) {
      const process = await this.prisma.client.processo.findFirst({
        where: { id: processoId, escritorioId, excluidoEm: null },
      });
      if (!process) throw new BadRequestException('Processo relacionado inválido.');
    } else {
      processoId =
        (
          await this.prisma.client.processo.findFirst({
            where: { escritorioId, numeroCnj: formatCnj(digits), excluidoEm: null },
            select: { id: true },
          })
        )?.id ?? null;
    }
    const legalFolders = processoId
      ? await this.prisma.client.pastaJuridicaProcesso.findMany({
          where: { processoId, pastaJuridica: { escritorioId } },
          select: { pastaJuridicaId: true },
          take: 2,
        })
      : [];
    return this.prisma.client.configuracaoCaptura.create({
      data: {
        escritorioId,
        processoId,
        pastaJuridicaId: legalFolders.length === 1 ? legalFolders[0].pastaJuridicaId : null,
        numeroCnj: formatCnj(digits),
        numeroCnjSomenteDigitos: digits,
        capturaAtiva: input.capturaAtiva,
        status: input.capturaAtiva ? 'ATIVA' : 'PAUSADA',
      },
    });
  }

  async update(escritorioId: string, id: string, input: UpdateCaptureDto) {
    const current = await this.prisma.client.configuracaoCaptura.findFirst({
      where: { id, escritorioId },
    });
    if (!current) throw new NotFoundException('Configuração de captura não encontrada.');
    const digits = input.numeroCnj ? this.assertCnj(input.numeroCnj) : undefined;
    if (input.processoId) {
      const process = await this.prisma.client.processo.findFirst({
        where: { id: input.processoId, escritorioId, excluidoEm: null },
      });
      if (!process) throw new BadRequestException('Processo relacionado inválido.');
    }
    return this.prisma.client.configuracaoCaptura.update({
      where: { id },
      data: {
        numeroCnj: digits ? formatCnj(digits) : undefined,
        numeroCnjSomenteDigitos: digits,
        processoId: input.processoId,
        capturaAtiva: input.capturaAtiva,
        status:
          input.capturaAtiva === undefined ? undefined : input.capturaAtiva ? 'ATIVA' : 'PAUSADA',
      },
    });
  }

  async remove(escritorioId: string, id: string) {
    const current = await this.prisma.client.configuracaoCaptura.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Configuração de captura não encontrada.');
    await this.prisma.client.configuracaoCaptura.delete({ where: { id } });
  }

  async sync(escritorioId: string, id: string, actorId?: string) {
    const config = await this.prisma.client.configuracaoCaptura.findFirst({
      where: { id, escritorioId },
    });
    if (!config) throw new NotFoundException('Configuração de captura não encontrada.');
    const started = Date.now();
    await this.prisma.client.configuracaoCaptura.update({
      where: { id },
      data: { status: 'SINCRONIZANDO' },
    });
    try {
      const process = await this.dataJud.findProcess(config.numeroCnjSomenteDigitos);
      const now = new Date();
      if (!process) {
        await this.finishSync(
          config,
          actorId,
          'NAO_ENCONTRADO',
          0,
          started,
          'Não foi possível localizar este processo na fonte consultada.',
        );
        return { novidades: 0, resultado: 'NAO_ENCONTRADO' };
      }
      const result = await this.prisma.client.movimentoJudicialCapturado.createMany({
        data: process.movements.map((m) => ({
          escritorioId,
          processoId: config.processoId,
          provider: 'DATAJUD',
          externalId: m.externalId,
          numeroCnj: formatCnj(m.cnj),
          dataMovimento: m.date,
          tipo: m.type,
          descricao: m.description,
          tribunal: m.court,
          payloadBruto: m.rawReference as Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
      const outcome = result.count > 0 ? 'SUCESSO' : 'SEM_NOVIDADES';
      await this.finishSync(config, actorId, outcome, result.count, started);
      if (result.count > 0 && config.processoId)
        await this.timeline.record({
          escritorioId,
          processoId: config.processoId,
          tipo: 'MOVIMENTACAO',
          titulo:
            result.count === 1
              ? 'Nova movimentação capturada.'
              : `${result.count} novas movimentações capturadas.`,
          origem: 'IMPORTACAO',
          entidadeRelacionadaTipo: 'CONFIGURACAO_CAPTURA',
          entidadeRelacionadaId: id,
          dataEvento: now,
        });
      return { novidades: result.count, resultado: outcome };
    } catch (error) {
      this.logger.error(
        `Falha de captura config=${id}: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      await this.finishSync(config, actorId, 'ERRO', 0, started, PUBLIC_PROVIDER_ERROR);
      throw new BadRequestException(PUBLIC_PROVIDER_ERROR);
    }
  }

  private async finishSync(
    config: { id: string; escritorioId: string; capturaAtiva: boolean },
    actorId: string | undefined,
    resultado: 'SUCESSO' | 'SEM_NOVIDADES' | 'NAO_ENCONTRADO' | 'ERRO',
    novidades: number,
    started: number,
    erroPublico?: string,
  ) {
    await this.prisma.client.$transaction([
      this.prisma.client.historicoSincronizacaoCaptura.create({
        data: {
          escritorioId: config.escritorioId,
          configuracaoId: config.id,
          provider: 'DATAJUD',
          resultado,
          novidades,
          erroPublico,
          duracaoMs: Date.now() - started,
          sincronizadoPor: actorId,
        },
      }),
      this.prisma.client.configuracaoCaptura.update({
        where: { id: config.id },
        data: {
          status: resultado === 'ERRO' ? 'ERRO' : config.capturaAtiva ? 'ATIVA' : 'PAUSADA',
          ultimoResultado: resultado,
          ultimaSincronizacaoEm: new Date(),
          novidadesUltimaCaptura: novidades,
          ultimoErroPublico: erroPublico ?? null,
        },
      }),
    ]);
  }
}
