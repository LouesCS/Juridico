import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { CriarUsuarioInput, UsuarioRepository } from '../../domain/repositories/usuario.repository';

/**
 * `Usuario` é global (não tenant-scoped) — reafirma
 * docs/database/03-entidades-identidade-escritorios.md §3.1. Por isso este
 * repositório usa `prisma.client.usuario` diretamente, sem exigir
 * TenantContext (a extensão tenant-scoped não intercepta este modelo).
 */
@Injectable()
export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(input: CriarUsuarioInput) {
    return this.prisma.client.usuario.create({
      data: {
        nome: input.nome,
        sobrenome: input.sobrenome,
        email: input.email,
        senhaHash: input.senhaHash,
        status: 'PENDENTE',
      },
    });
  }

  async buscarPorEmail(email: string) {
    return this.prisma.client.usuario.findFirst({ where: { email } });
  }

  async buscarPorId(id: string) {
    return this.prisma.client.usuario.findFirst({ where: { id } });
  }

  async atualizarSenhaHash(usuarioId: string, senhaHash: string) {
    await this.prisma.client.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
  }

  async atualizarUltimoAcesso(usuarioId: string) {
    await this.prisma.client.usuario.update({
      where: { id: usuarioId },
      data: { ultimoAcessoEm: new Date() },
    });
  }
}
