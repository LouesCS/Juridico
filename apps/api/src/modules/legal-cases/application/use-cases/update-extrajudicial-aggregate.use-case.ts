import { Injectable } from '@nestjs/common';
import { Prisma, TipoParticipante } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import type { UpdateExtrajudicialAggregateDto } from '../../presentation/schemas/legal-case.schemas';

@Injectable()
export class UpdateExtrajudicialAggregateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    versao: number,
    dto: UpdateExtrajudicialAggregateDto,
  ) {
    const autores = dto.partes.filter((p) => p.tipo === 'AUTOR');
    const reus = dto.partes.filter((p) => p.tipo === 'REU');
    if (autores.filter((p) => p.principal).length !== 1)
      return Result.fail(
        new DomainError('MAIN_CLAIMANT_REQUIRED', 'Defina exatamente um Requerente principal.'),
      );
    if (reus.filter((p) => p.principal).length !== 1)
      return Result.fail(
        new DomainError('MAIN_RESPONDENT_REQUIRED', 'Defina exatamente um Requerido principal.'),
      );
    if (dto.partes.some((p) => !['AUTOR', 'REU'].includes(p.tipo) && p.principal))
      return Result.fail(
        new DomainError(
          'INVALID_MAIN_PARTY',
          'Somente Requerente ou Requerido pode ser principal.',
        ),
      );
    if (
      dto.processo.dataEncerramento &&
      dto.processo.dataEncerramento < dto.processo.dataDistribuicao
    )
      return Result.fail(
        new DomainError(
          'INVALID_DATE_RANGE',
          'A data de conclusão não pode ser anterior à data de entrada.',
        ),
      );

    try {
      const result = await this.prisma.client.$transaction(
        async (tx) => {
          const processo = await tx.processo.findFirst({
            where: { id: processoId, escritorioId, tipo: 'EXTRAJUDICIAL', excluidoEm: null },
            select: { id: true, versao: true },
          });
          if (!processo) throw new DomainError('NOT_FOUND', 'Processo não encontrado.');
          if (processo.versao !== versao)
            throw new DomainError(
              'STALE_VERSION',
              'Este processo foi atualizado por outra pessoa.',
              { versaoAtual: processo.versao },
            );

          const existingIds = dto.partes.flatMap((p) => (p.id ? [p.id] : []));
          const existing = existingIds.length
            ? await tx.parteProcesso.findMany({
                where: { id: { in: existingIds }, processoId, escritorioId, excluidoEm: null },
              })
            : [];
          if (existing.length !== existingIds.length)
            throw new DomainError('INVALID_PARTY', 'Participante inválido.');

          const clientIds = [
            ...new Set(dto.partes.flatMap((p) => (p.clienteId ? [p.clienteId] : []))),
          ];
          const clients = clientIds.length
            ? await tx.cliente.findMany({
                where: { id: { in: clientIds }, escritorioId, excluidoEm: null },
                select: { id: true, nome: true, tipo: true, cpf: true, cnpj: true },
              })
            : [];
          if (clients.length !== clientIds.length)
            throw new DomainError('INVALID_PARTY', 'Cliente inválido ou indisponível.');

          const duplicateKeys = dto.partes.map((p) => `${p.clienteId ?? `id:${p.id}`}:${p.tipo}`);
          if (new Set(duplicateKeys).size !== duplicateKeys.length)
            throw new DomainError(
              'DUPLICATE_PARTY',
              'A mesma pessoa não pode repetir o mesmo papel.',
            );

          await tx.parteProcesso.updateMany({
            where: {
              processoId,
              escritorioId,
              excluidoEm: null,
              ...(existingIds.length ? { id: { notIn: existingIds } } : {}),
            },
            data: { excluidoEm: new Date(), principal: false },
          });
          // Evita colisão temporária com o índice único parcial durante a troca.
          await tx.parteProcesso.updateMany({
            where: { processoId, escritorioId, excluidoEm: null },
            data: { principal: false },
          });
          for (const party of dto.partes) {
            if (party.id) {
              await tx.parteProcesso.update({
                where: { id: party.id },
                data: { tipo: party.tipo, principal: party.principal },
              });
            } else {
              const client = clients.find((c) => c.id === party.clienteId)!;
              await tx.parteProcesso.create({
                data: {
                  escritorioId,
                  processoId,
                  clienteId: client.id,
                  nome: client.nome,
                  natureza: client.tipo,
                  documento: client.cpf ?? client.cnpj,
                  ehNossoCliente: true,
                  tipo: party.tipo as TipoParticipante,
                  principal: party.principal,
                },
              });
            }
          }
          const updated = await tx.processo.updateMany({
            where: { id: processoId, escritorioId, versao },
            data: {
              numeroInterno: dto.processo.numeroInterno,
              instituicao: dto.processo.instituicao,
              dataDistribuicao: new Date(`${dto.processo.dataDistribuicao}T00:00:00.000Z`),
              dataEncerramento: dto.processo.dataEncerramento
                ? new Date(`${dto.processo.dataEncerramento}T00:00:00.000Z`)
                : null,
              status: dto.processo.status,
              observacoes: dto.processo.observacoes,
              numeroBeneficio: dto.processo.numeroBeneficio,
              versao: { increment: 1 },
              ultimaAtualizacaoEm: new Date(),
            },
          });
          if (updated.count !== 1)
            throw new DomainError(
              'STALE_VERSION',
              'Este processo foi atualizado por outra pessoa.',
            );
          return { versao: versao + 1 };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return Result.ok(result);
    } catch (error) {
      if (error instanceof DomainError) return Result.fail(error);
      throw error;
    }
  }
}
