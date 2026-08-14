import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { TimelineModule } from '../timeline/timeline.module';
import { AiQuotaService } from './application/ai-quota.service';
import { AiStreamBus } from './application/ai-stream-bus';
import { AiSummaryService } from './application/ai-summary.service';
import { CaseContextBuilder } from './application/context-builders/case-context-builder';
import { ClientContextBuilder } from './application/context-builders/client-context-builder';
import { DocumentContextBuilder } from './application/context-builders/document-context-builder';
import { TaskContextBuilder } from './application/context-builders/task-context-builder';
import { AiChatUseCase } from './application/use-cases/ai-chat.use-case';
import {
  CancelSummaryUseCase,
  GetSummarySourcesUseCase,
  GetSummaryUseCase,
  ListSummariesUseCase,
  RegenerateSummaryUseCase,
  SummaryFeedbackUseCase,
} from './application/use-cases/ai-summary-lifecycle.use-cases';
import { AiUsageUseCase } from './application/use-cases/ai-usage.use-case';
import { DashboardInsightsUseCase } from './application/use-cases/dashboard-insights.use-case';
import { RequestSummaryUseCase } from './application/use-cases/request-summary.use-case';
import { StreamSummaryUseCase } from './application/use-cases/stream-summary.use-case';
import { AiChatController } from './presentation/ai-chat.controller';
import { AiSummariesController } from './presentation/ai-summaries.controller';
import { AiUsageController } from './presentation/ai-usage.controller';
import { CaseAiController } from './presentation/case-ai.controller';
import { ClientAiController } from './presentation/client-ai.controller';
import { DocumentAiController } from './presentation/document-ai.controller';
import { TaskAiController } from './presentation/task-ai.controller';

/**
 * Reafirma Sprint 11 — módulo de negócio da IA (`ResumoIA`/`FonteIA`,
 * prompts, contexto, cota). A camada de PROVEDOR (`AiProviderRegistry`) é
 * `@Global()` em `shared/infrastructure/ai/`, importada implicitamente.
 * Importa `TimelineModule` (evento automático `IA_EXECUTADA`, mesmo padrão
 * de Clients/LegalCases/Documents) e `SearchModule` (Chat global reaproveita
 * `UniversalSearchUseCase`, exportado desde esta rodada).
 */
@Module({
  imports: [TimelineModule, SearchModule],
  controllers: [
    CaseAiController,
    DocumentAiController,
    ClientAiController,
    TaskAiController,
    AiSummariesController,
    AiChatController,
    AiUsageController,
  ],
  providers: [
    CaseContextBuilder,
    DocumentContextBuilder,
    ClientContextBuilder,
    TaskContextBuilder,
    AiQuotaService,
    AiStreamBus,
    AiSummaryService,
    RequestSummaryUseCase,
    GetSummaryUseCase,
    ListSummariesUseCase,
    GetSummarySourcesUseCase,
    RegenerateSummaryUseCase,
    CancelSummaryUseCase,
    SummaryFeedbackUseCase,
    StreamSummaryUseCase,
    AiChatUseCase,
    AiUsageUseCase,
    DashboardInsightsUseCase,
  ],
  exports: [AiQuotaService, AiUsageUseCase],
})
export class AiModule {}
