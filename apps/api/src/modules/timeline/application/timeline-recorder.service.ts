import { Injectable, Logger } from '@nestjs/common';
import { OrigemEvento, Prisma, TipoEventoTimeline } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

export interface RecordTimelineEventInput {
  escritorioId: string;
  /** Exatamente um entre `processoId`/`tarefaId`/`membroId` deve ser informado. */
  processoId?: string;
  /** Adicionado no Prompt 14 (Task Engine) — generaliza a Timeline para Tarefa, mesma técnica do Sprint 11 com `ResumoIA`. */
  tarefaId?: string;
  /** Adicionado no módulo Colaboradores — generaliza a Timeline para Membro (colaborador), mesma técnica de `tarefaId` acima. */
  membroId?: string;
  /** Contexto genérico da Pasta Jurídica; não confundir com pasta documental. */
  pastaJuridicaId?: string;
  tipo: TipoEventoTimeline;
  titulo: string;
  descricao?: string;
  autorId?: string;
  origem?: OrigemEvento;
  entidadeRelacionadaTipo?: string;
  entidadeRelacionadaId?: string;
  metadados?: Record<string, unknown>;
  dataEvento?: Date;
}

/**
 * Único caminho de escrita em `EventoTimeline` — reafirma a instrução da
 * Sprint 08 ("nenhuma tela deve gravar diretamente na Timeline; toda
 * gravação deve passar pela camada de domínio") e docs/api/11-timeline.md
 * (eventos de origem `SISTEMA` só existem como efeito colateral de outra
 * operação). Use cases de outros módulos (Clients, LegalCases) injetam
 * este serviço e chamam `record(...)` como último passo, nunca escrevem em
 * `prisma.client.eventoTimeline` diretamente.
 *
 * Eventos do tipo `PRAZO` são deliberadamente **não** gravados aqui — são
 * projetados a partir de `Prazo` na leitura (`ListCaseTimelineUseCase`),
 * exatamente como especificado em docs/api/11-timeline.md §11.1, para
 * evitar duas fontes de verdade divergentes sobre o mesmo prazo.
 *
 * Mesma filosofia de `AuditService.registrar` — registrar um evento é
 * caminho secundário; uma falha aqui nunca deve derrubar a operação de
 * negócio que está sendo registrada, só logada.
 */
@Injectable()
export class TimelineRecorderService {
  private readonly logger = new Logger(TimelineRecorderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordTimelineEventInput): Promise<void> {
    try {
      await this.prisma.client.eventoTimeline.create({
        data: {
          escritorioId: input.escritorioId,
          escopoTipo: input.pastaJuridicaId
            ? 'PASTA_JURIDICA'
            : input.membroId
              ? 'COLABORADOR'
              : input.tarefaId
                ? 'TAREFA'
                : 'PROCESSO',
          processoId: input.processoId,
          tarefaId: input.tarefaId,
          membroId: input.membroId,
          pastaJuridicaId: input.pastaJuridicaId,
          tipo: input.tipo,
          titulo: input.titulo,
          descricao: input.descricao,
          dataEvento: input.dataEvento ?? new Date(),
          origem: input.origem ?? 'SISTEMA',
          autorId: input.autorId,
          entidadeRelacionadaTipo: input.entidadeRelacionadaTipo,
          entidadeRelacionadaId: input.entidadeRelacionadaId,
          metadados: (input.metadados ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao gravar evento de timeline (tipo=${input.tipo}, processoId=${input.processoId}, tarefaId=${input.tarefaId}, membroId=${input.membroId}): ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
      );
    }
  }
}
