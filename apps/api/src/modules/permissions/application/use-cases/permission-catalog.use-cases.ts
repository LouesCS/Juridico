import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';

/** `GET /permissions` — catálogo completo, usado pela matriz de permissões da tela administrativa. */
@Injectable()
export class ListPermissionCatalogUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.client.permissao.findMany({
      orderBy: [{ categoria: 'asc' }, { recurso: 'asc' }, { acao: 'asc' }],
    });
  }
}

/** `GET /roles` já existe em MembershipsModule (`ListRolesUseCase`) — reaproveitado, não duplicado aqui. */

/** `GET /roles/:id` — papel + as chaves de permissão concedidas a ele. */
@Injectable()
export class GetRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, papelId: string): Promise<Result<unknown>> {
    const papel = await this.prisma.client.papel.findFirst({
      where: { id: papelId, OR: [{ ehSistema: true }, { escritorioId }] },
      include: { permissoes: { include: { permissao: true } } },
    });
    if (!papel) return Result.fail(new DomainError('NOT_FOUND', 'Papel não encontrado.'));

    return Result.ok({
      id: papel.id,
      nome: papel.nome,
      descricao: papel.descricao,
      nivel: papel.nivel,
      ehSistema: papel.ehSistema,
      permissoes: papel.permissoes.map((pp) => pp.permissao.chave),
    });
  }
}
