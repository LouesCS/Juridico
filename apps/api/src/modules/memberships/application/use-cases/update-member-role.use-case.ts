import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { assertNotLastActiveOwner } from '../guards/last-owner.guard';

/**
 * Reafirma regra 25 de docs/database/12-eventos-fluxos-regras.md §12.4
 * (prevenção de auto-escalonamento) e §12.3.11 (proteção do último OWNER).
 *
 * Achado real do Permission Engine (Prompt 12): `novoPapelId` nunca era
 * validado além de "é um UUID" (Zod) — nada impedia atribuir a um membro
 * um `Papel` customizado de OUTRO escritório (`Papel.escritorioId` é uma
 * FK solta, sem checagem cruzada aqui). Corrigido: o papel alvo precisa
 * ser um papel de sistema (`ehSistema: true`) ou pertencer ao mesmo
 * `escritorioId` do membro sendo alterado.
 */
@Injectable()
export class UpdateMemberRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    atorMembroId: string,
    alvoMembroId: string,
    novoPapelId: string,
  ): Promise<Result<void>> {
    if (atorMembroId === alvoMembroId) {
      return Result.fail(
        new DomainError('SELF_ESCALATION_FORBIDDEN', 'Você não pode alterar o próprio papel.'),
      );
    }

    const alvo = await this.prisma.client.membro.findFirst({
      where: { id: alvoMembroId, escritorioId },
      include: { papel: true },
    });
    if (!alvo) {
      return Result.fail(new DomainError('NOT_FOUND', 'Membro não encontrado.'));
    }

    const novoPapel = await this.prisma.client.papel.findFirst({
      where: { id: novoPapelId, OR: [{ ehSistema: true }, { escritorioId }] },
    });
    if (!novoPapel) {
      return Result.fail(new DomainError('NOT_FOUND', 'Papel inválido para este escritório.'));
    }

    const erroUltimoOwner = await assertNotLastActiveOwner(
      this.prisma,
      escritorioId,
      alvoMembroId,
      alvo.papel.nome,
    );
    if (erroUltimoOwner) return Result.fail(erroUltimoOwner);

    await this.prisma.client.membro.update({
      where: { id: alvoMembroId },
      data: { papelId: novoPapelId },
    });

    return Result.ok(undefined);
  }
}
