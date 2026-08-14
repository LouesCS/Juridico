import { Injectable, Logger } from '@nestjs/common';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { GROUP_ORDER, SearchAdapter, SearchGroupResult } from '../../domain/search-types';
import { parseRequestedTypes, SearchQuery } from '../../presentation/schemas/search.schemas';
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
} from '../search-adapters';

/**
 * Orquestra os 10 adapters (`GET /v1/search`, reafirma docs/api/15-search.md
 * §15.1). Cada grupo roda em paralelo (`Promise.allSettled`) e é isolado do
 * resto — um adapter com erro nunca derruba os demais nem o request inteiro
 * (reafirma docs/ux/09-busca-global.md §9.13 "renderização progressiva por
 * grupo"). Ordem de saída é sempre `GROUP_ORDER`, nunca a ordem de conclusão.
 */
@Injectable()
export class UniversalSearchUseCase {
  private readonly logger = new Logger(UniversalSearchUseCase.name);
  private readonly adapters: SearchAdapter[];

  constructor(
    clientAdapter: ClientSearchAdapter,
    legalCaseAdapter: LegalCaseSearchAdapter,
    documentAdapter: DocumentSearchAdapter,
    deadlineAdapter: DeadlineSearchAdapter,
    taskAdapter: TaskSearchAdapter,
    teamAdapter: TeamSearchAdapter,
    folderAdapter: FolderSearchAdapter,
    timelineAdapter: TimelineSearchAdapter,
    tagAdapter: TagSearchAdapter,
    commentAdapter: CommentSearchAdapter,
    publicationAdapter: PublicationSearchAdapter,
    judicialMovementAdapter: JudicialMovementSearchAdapter,
    extrajudicialMovementAdapter?: ExtrajudicialMovementSearchAdapter,
    requestAdapter?: RequestSearchAdapter,
  ) {
    // Ordem de registro é irrelevante para a resposta (reordenada por
    // `GROUP_ORDER` no final) — mantida igual a `GROUP_ORDER` só por leitura.
    this.adapters = [
      clientAdapter,
      legalCaseAdapter,
      documentAdapter,
      deadlineAdapter,
      taskAdapter,
      teamAdapter,
      folderAdapter,
      timelineAdapter,
      tagAdapter,
      commentAdapter,
      publicationAdapter,
      judicialMovementAdapter,
      ...(extrajudicialMovementAdapter ? [extrajudicialMovementAdapter] : []),
      ...(requestAdapter ? [requestAdapter] : []),
    ];
  }

  async execute(escritorioId: string, user: AuthUser, query: SearchQuery) {
    const requestedTypes = new Set(parseRequestedTypes(query.types));
    const activeAdapters = this.adapters.filter((a) => requestedTypes.has(a.type));

    const settled = await Promise.allSettled(
      activeAdapters.map((adapter) =>
        adapter.search({ escritorioId, user, q: query.q, limit: query.limit }),
      ),
    );

    const groupsByType = new Map<string, SearchGroupResult>();
    settled.forEach((result, index) => {
      const adapter = activeAdapters[index];
      if (result.status === 'fulfilled') {
        groupsByType.set(adapter.type, result.value);
        return;
      }
      this.logger.warn(`Adapter de busca "${adapter.type}" falhou: ${String(result.reason)}`);
      groupsByType.set(adapter.type, {
        type: adapter.type,
        total: 0,
        items: [],
        disponivel: false,
      });
    });

    const groups = GROUP_ORDER.filter((type) => groupsByType.has(type)).map((type) =>
      groupsByType.get(type)!,
    );

    return { query: query.q, groups };
  }
}
