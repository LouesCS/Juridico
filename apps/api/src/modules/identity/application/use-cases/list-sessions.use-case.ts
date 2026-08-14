import { Inject, Injectable } from '@nestjs/common';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';

@Injectable()
export class ListSessionsUseCase {
  constructor(@Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository) {}

  async execute(usuarioId: string, sessaoAtualId: string) {
    const sessoes = await this.sessaoRepository.listarAtivasPorUsuario(usuarioId);
    return sessoes.map((s) => ({
      id: s.id,
      dispositivo: s.dispositivo,
      ip: s.ip,
      ultimoUsoEm: s.ultimoUsoEm,
      criadaEm: s.criadaEm,
      atual: s.id === sessaoAtualId,
    }));
  }
}
