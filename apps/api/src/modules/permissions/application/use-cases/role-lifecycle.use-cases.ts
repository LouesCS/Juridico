import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from '../../presentation/schemas/permissions.schemas';

/**
 * "Teto de privilégio" (privilege ceiling) — regra clássica de delegação
 * RBAC, aplicada em Create/UpdateRolePermissions: quem tem `role:manage`
 * só pode conceder, a um perfil que está criando/editando, permissões que
 * ELE MESMO possui. Sem isso, um ADMIN com `role:manage` (concedido pelo
 * OWNER) poderia criar um perfil com `case:read:confidential` mesmo sem
 * ter essa permissão — uma escalada de privilégio indireta via a própria
 * ferramenta de administração de permissões.
 */
function assertNoEscalation(
  atorPermissions: string[],
  permissoesSolicitadas: string[],
): DomainError | null {
  const naoPermitidas = permissoesSolicitadas.filter((chave) => !atorPermissions.includes(chave));
  if (naoPermitidas.length === 0) return null;
  return new DomainError(
    'FORBIDDEN',
    'Você não pode conceder a um perfil uma permissão que você mesmo não possui.',
    { permissoesNaoPermitidas: naoPermitidas },
  );
}

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    atorMembroId: string,
    atorPermissions: string[],
    input: CreateRoleDto,
  ): Promise<Result<{ id: string }>> {
    const escalacao = assertNoEscalation(atorPermissions, input.permissoes);
    if (escalacao) return Result.fail(escalacao);

    const permissoesValidas = await this.prisma.client.permissao.findMany({
      where: { chave: { in: input.permissoes } },
    });
    if (permissoesValidas.length !== input.permissoes.length) {
      return Result.fail(
        new DomainError('NOT_FOUND', 'Uma ou mais permissões informadas não existem no catálogo.'),
      );
    }

    const ator = await this.prisma.client.membro.findFirst({
      where: { id: atorMembroId, escritorioId },
      include: { papel: true },
    });
    // Um perfil criado nunca nasce no mesmo nível (ou acima) de quem o
    // criou — mesmo racional de "teto de privilégio" acima, aplicado ao
    // nível hierárquico do papel em si.
    const nivel = Math.max(1, (ator?.papel.nivel ?? 1) - 1);

    const papel = await this.prisma.client.papel.create({
      data: {
        escritorioId,
        nome: input.nome,
        descricao: input.descricao,
        nivel,
        ehSistema: false,
        permissoes: {
          create: permissoesValidas.map((p) => ({ permissaoId: p.id })),
        },
      },
    });

    return Result.ok({ id: papel.id });
  }
}

@Injectable()
export class UpdateRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    papelId: string,
    input: UpdateRoleDto,
  ): Promise<Result<void>> {
    const papel = await this.prisma.client.papel.findFirst({
      where: { id: papelId, escritorioId },
    });
    if (!papel) {
      return Result.fail(new DomainError('NOT_FOUND', 'Perfil customizado não encontrado.'));
    }
    if (papel.ehSistema) {
      return Result.fail(
        new DomainError('FORBIDDEN', 'Perfis de sistema não podem ser renomeados.'),
      );
    }

    await this.prisma.client.papel.update({
      where: { id: papelId },
      data: { nome: input.nome, descricao: input.descricao },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class UpdateRolePermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    papelId: string,
    atorPermissions: string[],
    input: UpdateRolePermissionsDto,
  ): Promise<Result<void>> {
    const papel = await this.prisma.client.papel.findFirst({
      where: { id: papelId, escritorioId },
    });
    if (!papel) {
      return Result.fail(new DomainError('NOT_FOUND', 'Perfil customizado não encontrado.'));
    }
    if (papel.ehSistema) {
      return Result.fail(
        new DomainError(
          'FORBIDDEN',
          'Perfis de sistema têm permissões fixas — crie um perfil customizado.',
        ),
      );
    }

    const escalacao = assertNoEscalation(atorPermissions, input.permissoes);
    if (escalacao) return Result.fail(escalacao);

    const permissoesValidas = await this.prisma.client.permissao.findMany({
      where: { chave: { in: input.permissoes } },
    });
    if (permissoesValidas.length !== input.permissoes.length) {
      return Result.fail(
        new DomainError('NOT_FOUND', 'Uma ou mais permissões informadas não existem no catálogo.'),
      );
    }

    await this.prisma.client.$transaction([
      this.prisma.client.papelPermissao.deleteMany({ where: { papelId } }),
      this.prisma.client.papelPermissao.createMany({
        data: permissoesValidas.map((p) => ({ papelId, permissaoId: p.id })),
      }),
    ]);

    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, papelId: string): Promise<Result<void>> {
    const papel = await this.prisma.client.papel.findFirst({
      where: { id: papelId, escritorioId },
    });
    if (!papel) {
      return Result.fail(new DomainError('NOT_FOUND', 'Perfil customizado não encontrado.'));
    }
    if (papel.ehSistema) {
      return Result.fail(
        new DomainError('FORBIDDEN', 'Perfis de sistema não podem ser excluídos.'),
      );
    }

    const membrosComEstePerfil = await this.prisma.client.membro.count({ where: { papelId } });
    if (membrosComEstePerfil > 0) {
      return Result.fail(
        new DomainError(
          'ROLE_IN_USE',
          'Este perfil está atribuído a um ou mais membros e não pode ser excluído.',
          {
            membros: membrosComEstePerfil,
          },
        ),
      );
    }

    await this.prisma.client.papel.delete({ where: { id: papelId } });
    return Result.ok(undefined);
  }
}
