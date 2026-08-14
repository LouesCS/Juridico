import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { AiStreamBus } from '../ai-stream-bus';
import { assertResumoAccess } from '../resumo-access';

/**
 * Reafirma docs/api/14-ai.md §14.3 — reconectar a um `streamUrl` de uma
 * geração já concluída (`PRONTO`/`FALHA`) retorna `done`/`error` IMEDIATAMENTE
 * (idempotente), sem tocar `AiStreamBus`; só para `GERANDO`/`PENDENTE` a
 * stream se inscreve no bus e repassa os eventos publicados por
 * `AiSummaryService.runGeneration`.
 */
@Injectable()
export class StreamSummaryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streamBus: AiStreamBus,
  ) {}

  async execute(
    escritorioId: string,
    id: string,
    user: AuthUser,
  ): Promise<Result<Observable<MessageEvent>>> {
    const resumo = await this.prisma.client.resumoIA.findFirst({ where: { id, escritorioId } });
    if (!resumo) return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    if (!(await assertResumoAccess(this.prisma, escritorioId, resumo, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    }

    if (resumo.status === 'PRONTO') {
      return Result.ok(
        new Observable<MessageEvent>((subscriber) => {
          subscriber.next({
            type: 'done',
            data: {
              id: resumo.id,
              status: 'PRONTO',
              tokensEntrada: resumo.tokensEntrada,
              tokensSaida: resumo.tokensSaida,
            },
          });
          subscriber.complete();
        }),
      );
    }

    if (resumo.status === 'FALHA' || resumo.status === 'EXPIRADO') {
      return Result.ok(
        new Observable<MessageEvent>((subscriber) => {
          subscriber.next({
            type: 'error',
            data: { code: 'AI_PROVIDER_UNAVAILABLE', message: resumo.erro ?? 'Falha na geração.' },
          });
          subscriber.complete();
        }),
      );
    }

    return Result.ok(
      new Observable<MessageEvent>((subscriber) => {
        const unsubscribe = this.streamBus.subscribe(id, (event) => {
          subscriber.next({ type: event.type, data: event.data as object });
          if (event.type === 'done' || event.type === 'error') {
            subscriber.complete();
          }
        });
        return () => unsubscribe();
      }),
    );
  }
}
