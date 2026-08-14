import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type AiStreamEventType = 'token' | 'source' | 'done' | 'error';

export interface AiStreamEvent {
  type: AiStreamEventType;
  data: unknown;
}

/**
 * Reafirma docs/api/14-ai.md §14.3 (SSE) — pub/sub em memória, chaveado por
 * `resumoId`, para que `GET /ai-summaries/:id/stream` (uma conexão HTTP)
 * observe tokens publicados pela geração assíncrona disparada por
 * `POST .../ai-summaries` (outra requisição, já retornada). Limitação
 * honesta: só funciona dentro do MESMO processo Node — uma implantação
 * multi-instância precisaria de um bus real (Redis pub/sub), mesma
 * observação já registrada para Notifications/SSE
 * (docs/frontend/20-notifications-sse.md §20.2) nunca implementado. Suficiente
 * para este ambiente (uma instância, sem Redis pub/sub configurado).
 */
@Injectable()
export class AiStreamBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  publish(resumoId: string, event: AiStreamEvent): void {
    this.emitter.emit(resumoId, event);
  }

  subscribe(resumoId: string, listener: (event: AiStreamEvent) => void): () => void {
    this.emitter.on(resumoId, listener);
    return () => this.emitter.off(resumoId, listener);
  }
}
