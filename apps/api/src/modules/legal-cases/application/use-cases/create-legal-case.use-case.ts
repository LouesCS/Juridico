import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { isValidCnj, normalizeCnj } from '../../domain/cnj';
import { CreateLegalCaseDto } from '../../presentation/schemas/legal-case.schemas';

/** Reafirma docs/api/09-legal-cases.md §9.1 (`POST /v1/legal-cases`). */
@Injectable()
export class CreateLegalCaseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    dto: CreateLegalCaseDto,
    atorMembroId?: string,
  ): Promise<Result<{ id: string }>> {
    if (!dto.pastaJuridicaId) {
      return Result.fail(
        new DomainError(
          'LEGAL_FOLDER_REQUIRED',
          'Processos Judiciais devem ser criados dentro de uma Pasta Jurídica.',
        ),
      );
    }
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: dto.clienteId, escritorioId },
      select: { id: true },
    });
    if (!cliente) return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));

    const responsavel = await this.prisma.client.membro.findFirst({
      where: { id: dto.responsavelPrincipalId, escritorioId, status: 'ATIVO' },
      select: { id: true },
    });
    if (!responsavel) {
      return Result.fail(new DomainError('NOT_FOUND', 'Advogado responsável não encontrado.'));
    }

    let numeroCnj: string | undefined;
    if (dto.numeroCnj) {
      if (!isValidCnj(dto.numeroCnj)) {
        return Result.fail(
          new DomainError('INVALID_CHECK_DIGIT', 'Número CNJ com dígito verificador inválido.'),
        );
      }
      numeroCnj = normalizeCnj(dto.numeroCnj);

      const duplicado = await this.prisma.client.processo.findFirst({
        where: { escritorioId, numeroCnj },
        select: { id: true },
      });
      if (duplicado) {
        return Result.fail(
          new DomainError('DUPLICATE_CNJ', 'Já existe um processo com este número.', {
            processoExistenteId: duplicado.id,
          }),
        );
      }
    }

    const transactionResult = await this.prisma.client.$transaction(async (tx) => {
      if (dto.pastaJuridicaId) {
        const lockedFolders = await tx.$queryRaw<Array<{ cliente_principal_id: string }>>(
          Prisma.sql`
            SELECT "cliente_principal_id"
            FROM "pastas_juridicas"
            WHERE "id" = ${dto.pastaJuridicaId}::uuid
              AND "escritorio_id" = ${escritorioId}::uuid
              AND "excluido_em" IS NULL
            FOR UPDATE
          `,
        );
        const folder = lockedFolders[0];
        if (!folder) return { error: 'FOLDER_NOT_FOUND' as const };
        if (folder.cliente_principal_id !== dto.clienteId)
          return { error: 'FOLDER_CLIENT_MISMATCH' as const };

        const existing = await tx.pastaJuridicaProcesso.findFirst({
          where: {
            pastaJuridicaId: dto.pastaJuridicaId,
            processo: { tipo: dto.tipo },
          },
          select: { processoId: true },
        });
        if (existing) return { error: 'FOLDER_PROCESS_LIMIT' as const };
      }

      const criado = await tx.processo.create({
        data: {
          escritorioId,
          clienteId: dto.clienteId,
          titulo: dto.titulo,
          numeroCnj,
          numeroInterno: dto.numeroInterno,
          area: dto.area,
          tipoAcao: dto.tipoAcao,
          tipo: dto.tipo,
          tribunal: dto.tribunal,
          comarca: dto.comarca,
          vara: dto.vara,
          uf: dto.uf,
          instancia: dto.instancia,
          classeProcessual: dto.classeProcessual,
          assunto: dto.assunto,
          poloCliente: dto.poloCliente,
          status: dto.status,
          prioridade: dto.prioridade,
          segredoJustica: dto.segredoJustica,
          valorCausaCentavos:
            dto.valorCausaCentavos !== undefined ? BigInt(dto.valorCausaCentavos) : undefined,
          dataDistribuicao: dto.dataDistribuicao ? new Date(dto.dataDistribuicao) : undefined,
          responsavelPrincipalId: dto.responsavelPrincipalId,
          descricao: dto.descricao,
          observacoes: dto.observacoes,
        },
        select: { id: true },
      });

      await tx.processoMembro.create({
        data: {
          processoId: criado.id,
          membroId: dto.responsavelPrincipalId,
          responsavelPrincipal: true,
          acessoPermitido: 'LEITURA_ESCRITA',
        },
      });

      if (dto.pastaJuridicaId) {
        await tx.pastaJuridicaProcesso.create({
          data: { pastaJuridicaId: dto.pastaJuridicaId, processoId: criado.id },
        });
      }

      return { processo: criado };
    });

    if ('error' in transactionResult) {
      if (transactionResult.error === 'FOLDER_NOT_FOUND')
        return Result.fail(new DomainError('NOT_FOUND', 'Pasta Jurídica não encontrada.'));
      if (transactionResult.error === 'FOLDER_CLIENT_MISMATCH')
        return Result.fail(
          new DomainError('FORBIDDEN', 'A Pasta não pertence ao Cliente informado.'),
        );
      const tipo = dto.tipo === 'EXTRAJUDICIAL' ? 'Extrajudicial' : 'Judicial';
      return Result.fail(
        new DomainError(
          'LEGAL_FOLDER_PROCESS_LIMIT',
          `Esta Pasta já possui um Processo ${tipo}. Para cadastrar outro Processo ${tipo} para este cliente, crie uma nova Pasta.`,
        ),
      );
    }
    const processo = transactionResult.processo;

    await this.timeline.record({
      escritorioId,
      processoId: processo.id,
      tipo: 'CRIACAO_PROCESSO',
      titulo: `Processo "${dto.titulo}" criado`,
      autorId: atorMembroId,
    });

    return Result.ok(processo);
  }
}
