import { Module } from '@nestjs/common';
import { TimelineRecorderService } from './application/timeline-recorder.service';
import { ListCaseTimelineUseCase } from './application/use-cases/list-case-timeline.use-case';
import { ListRecentTimelineAggregateUseCase } from './application/use-cases/list-recent-timeline-aggregate.use-case';
import {
  CreateManualTimelineEventUseCase,
  DeleteManualTimelineEventUseCase,
  UpdateManualTimelineEventUseCase,
} from './application/use-cases/manual-timeline-event.use-cases';
import { RecentTimelineController } from './presentation/recent-timeline.controller';
import { TimelineController } from './presentation/timeline.controller';

/**
 * Exporta `TimelineRecorderService` — o único caminho de escrita em
 * `EventoTimeline` — para que `ClientsModule`/`LegalCasesModule` possam
 * injetá-lo em seus próprios use cases e registrar eventos automáticos
 * (reafirma Sprint 08: "nenhuma tela deve gravar diretamente na Timeline").
 * `ListRecentTimelineAggregateUseCase` importa funções puras de
 * `legal-cases/application/case-scope.ts` (sem DI, sem import do módulo
 * NestJS `LegalCasesModule`) — não há dependência circular entre módulos.
 */
@Module({
  controllers: [TimelineController, RecentTimelineController],
  providers: [
    TimelineRecorderService,
    ListCaseTimelineUseCase,
    ListRecentTimelineAggregateUseCase,
    CreateManualTimelineEventUseCase,
    UpdateManualTimelineEventUseCase,
    DeleteManualTimelineEventUseCase,
  ],
  exports: [TimelineRecorderService],
})
export class TimelineModule {}
