import { Injectable } from '@nestjs/common';
import { Prisma, TipoParticipante } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { isValidCnj, normalizeCnj } from '../../domain/cnj';
import type { UpdateJudicialAggregateDto } from '../../presentation/schemas/legal-case.schemas';

/**
 * Espelha `UpdateExtrajudicialAggregateUseCase` (mesma transação única,
 * mesma estratégia de "zera tudo antes de reaplicar" para não colidir com
 * o índice único parcial de principal) — só os campos de `Processo` e as
 * regras de principal por papel mudam para o Judicial.
 */
@Injectable()
export class UpdateJudicialAggregateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    versao: number,
    dto: UpdateJudicialAggregateDto,
  ) {
    const autores = dto.partes.filter((p) => p.tipo === 'AUTOR');
    const reus = dto.partes.filter((p) => p.tipo === 'REU');
    const advogadosAutor = dto.partes.filter((p) => p.tipo === 'ADVOGADO_AUTOR');
    const advogadosReu = dto.partes.filter((p) => p.tipo === 'ADVOGADO_REU');
    if (autores.filter((p) => p.principal).length !== 1)
      return Result.fail(
        new DomainError('MAIN_CLAIMANT_REQUIRED', 'Defina exatamente um Autor principal.'),
      );
    if (reus.filter((p) => p.principal).length !== 1)
      return Result.fail(
        new DomainError('MAIN_RESPONDENT_REQUIRED', 'Defina exatamente um Réu principal.'),
      );
    if (advogadosAutor.filter((p) => p.principal).length > 1)
      return Result.fail(
        new DomainError(
          'MAIN_CLAIMANT_LAWYER_CONFLICT',
          'Defina no máximo um Advogado principal dos autores.',
        ),
      );
    if (advogadosReu.filter((p) => p.principal).length > 1)
      return Result.fail(
        new DomainError(
          'MAIN_RESPONDENT_LAWYER_CONFLICT',
          'Defina no máximo um Advogado principal dos réus.',
        ),
      );
    const mainRoles = new Set(['AUTOR', 'REU', 'ADVOGADO_AUTOR', 'ADVOGADO_REU']);
    if (dto.partes.some((p) => !mainRoles.has(p.tipo) && p.principal))
      return Result.fail(
        new DomainError(
          'INVALID_MAIN_PARTY',
          'Somente Autor, Réu ou seus Advogados podem ser principal.',
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
    if (!isValidCnj(dto.processo.numeroCnj))
      return Result.fail(
        new DomainError('INVALID_CHECK_DIGIT', 'Número CNJ com dígito verificador inválido.'),
      );
    const numeroCnj = normalizeCnj(dto.processo.numeroCnj);

    try {
      const result = await this.prisma.client.$transaction(
        async (tx) => {
          const processo = await tx.processo.findFirst({
            where: { id: processoId, escritorioId, tipo: 'JUDICIAL', excluidoEm: null },
            select: { id: true, versao: true },
          });
          if (!processo) throw new DomainError('NOT_FOUND', 'Processo não encontrado.');
          if (processo.versao !== versao)
            throw new DomainError(
              'STALE_VERSION',
              'Este processo foi atualizado por outra pessoa.',
              { versaoAtual: processo.versao },
            );

          const cnjDuplicado = await tx.processo.findFirst({
            where: { escritorioId, numeroCnj, id: { not: processoId } },
            select: { id: true },
          });
          if (cnjDuplicado)
            throw new DomainError('DUPLICATE_CNJ', 'Já existe um processo com este número.', {
              processoExistenteId: cnjDuplicado.id,
            });

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
              numeroCnj,
              tribunal: dto.processo.tribunal,
              comarca: dto.processo.comarca,
              vara: dto.processo.vara,
              tipoAcao: dto.processo.tipoAcao,
              area: dto.processo.area,
              poloCliente: dto.processo.poloCliente,
              instancia: dto.processo.instancia,
              dataDistribuicao: new Date(`${dto.processo.dataDistribuicao}T00:00:00.000Z`),
              dataEncerramento: dto.processo.dataEncerramento
                ? new Date(`${dto.processo.dataEncerramento}T00:00:00.000Z`)
                : null,
              status: dto.processo.status,
              observacoes: dto.processo.observacoes,
              numeroBeneficio: dto.processo.numeroBeneficio,
              roNumeroBeneficio: dto.processo.roNumeroBeneficio,
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
