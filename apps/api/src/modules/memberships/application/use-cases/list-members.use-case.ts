import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class ListMembersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    const membros = await this.prisma.client.membro.findMany({
      where: { escritorioId },
      include: { usuario: true, papel: true },
      orderBy: { criadoEm: 'asc' },
    });
    return membros.map((m) => ({
      id: m.id,
      // `m.usuario` pode ser `null` desde o módulo Colaboradores (colaborador
      // sem conta de acesso) — mantém a chave `usuario` como `null` nesse
      // caso em vez de um objeto com campos `undefined`.
      usuario: m.usuario
        ? { nome: m.usuario.nome, email: m.usuario.email, avatarUrl: m.usuario.avatarUrl }
        : null,
      papel: m.papel.nome,
      status: m.status,
      entrouEm: m.entrouEm,
    }));
  }
}
