import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../../domain/repositories/usuario.repository';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';

/**
 * Reafirma docs/api/04-identity.md §4.9 — carrega o AppShell no boot do frontend.
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(authUser: AuthUser) {
    const usuario = await this.usuarioRepository.buscarPorId(authUser.usuarioId);
    if (!usuario) throw new NotFoundException();

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: authUser.membroId },
      include: { papel: true },
    });
    const escritorio = await this.prisma.client.escritorio.findFirst({
      where: { id: authUser.escritorioId },
    });

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        sobrenome: usuario.sobrenome,
        email: usuario.email,
        avatarUrl: usuario.avatarUrl,
        tema: usuario.tema,
        idioma: usuario.idioma,
      },
      membro: {
        id: membro?.id,
        papel: membro?.papel.nome,
        permissions: authUser.permissions,
      },
      escritorio: {
        id: escritorio?.id,
        nome: escritorio?.nomeFantasia,
        slug: escritorio?.slug,
      },
    };
  }
}
