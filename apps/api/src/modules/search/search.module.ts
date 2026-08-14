import { Module } from '@nestjs/common';
import {
  ClientSearchAdapter,
  CommentSearchAdapter,
  DeadlineSearchAdapter,
  DocumentSearchAdapter,
  FolderSearchAdapter,
  LegalCaseSearchAdapter,
  TagSearchAdapter,
  TaskSearchAdapter,
  TeamSearchAdapter,
  TimelineSearchAdapter,
  PublicationSearchAdapter,
  JudicialMovementSearchAdapter,
  ExtrajudicialMovementSearchAdapter,
  RequestSearchAdapter,
} from './application/search-adapters';
import { SearchSuggestionsUseCase } from './application/use-cases/search-suggestions.use-case';
import { UniversalSearchUseCase } from './application/use-cases/universal-search.use-case';
import { SearchController } from './presentation/search.controller';

/**
 * Reafirma docs/backend-implementation/00-status.md — módulo Search
 * (Sprint 10). Sem novo modelo Prisma (as colunas `buscaTsv`/índices GIN já
 * existiam desde o Prompt 5C, nunca consumidas até agora) e sem import de
 * outro `Module` NestJS — os adapters importam apenas FUNÇÕES puras de
 * `legal-cases/application/case-scope.ts` e
 * `documents/application/document-scope.ts` (mesmo padrão de cross-module
 * import sem DI já usado por `ListRecentTimelineAggregateUseCase` e
 * `document-scope.ts` nas Sprints 08/09 — nenhuma dependência circular de
 * módulo é criada). `UniversalSearchUseCase` passou a ser exportado na
 * Sprint 11 — o Chat Jurídico global (`modules/ai/`) reaproveita a busca
 * real como fonte quando aberto fora de um processo/documento específico
 * ("Se aberto globalmente: Utilizar Universal Search como fonte"), em vez
 * de duplicar a lógica de indexação por tipo.
 */
@Module({
  controllers: [SearchController],
  providers: [
    ClientSearchAdapter,
    LegalCaseSearchAdapter,
    DocumentSearchAdapter,
    DeadlineSearchAdapter,
    TaskSearchAdapter,
    TeamSearchAdapter,
    FolderSearchAdapter,
    TimelineSearchAdapter,
    TagSearchAdapter,
    CommentSearchAdapter,
    PublicationSearchAdapter,
    JudicialMovementSearchAdapter,
    ExtrajudicialMovementSearchAdapter,
    RequestSearchAdapter,
    UniversalSearchUseCase,
    SearchSuggestionsUseCase,
  ],
  exports: [UniversalSearchUseCase],
})
export class SearchModule {}
