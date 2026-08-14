import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';

/** Mesmo padrão de `TarefaFavorito`/`DocumentoFavorito`/`PastaFavorito` — `ClienteFavorito`, nunca duplicado. */
@Injectable()
export class ToggleClientFavoriteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    clienteId: string,
    membroId: string,
  ): Promise<Result<{ favorito: boolean }>> {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
      select: { id: true, nome: true },
    });
    if (!cliente) return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));

    const existente = await this.prisma.client.clienteFavorito.findFirst({
      where: { clienteId, membroId },
    });

    const favorito = !existente;
    if (existente) {
      await this.prisma.client.clienteFavorito.delete({
        where: { clienteId_membroId: { clienteId, membroId } },
      });
    } else {
      await this.prisma.client.clienteFavorito.create({ data: { clienteId, membroId } });
    }

    // `PERSONALIZADO` reaproveitado (nenhum tipo dedicado de "favorito" no
    // enum `TipoEventoTimeline`) — mesmo racional de generalização que já
    // evitou valores novos para COMENTARIO/ALTERACAO_STATUS/etc. no Prompt 14.
    const processos = await this.prisma.client.processo.findMany({
      where: { clienteId },
      select: { id: true },
    });
    await Promise.all(
      processos.map((p) =>
        this.timeline.record({
          escritorioId,
          processoId: p.id,
          tipo: 'PERSONALIZADO',
          titulo: favorito
            ? `Cliente ${cliente.nome} foi adicionado aos favoritos`
            : `Cliente ${cliente.nome} foi removido dos favoritos`,
          autorId: membroId,
          entidadeRelacionadaTipo: 'cliente',
          entidadeRelacionadaId: clienteId,
        }),
      ),
    );

    return Result.ok({ favorito });
  }
}
