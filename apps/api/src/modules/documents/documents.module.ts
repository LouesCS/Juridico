import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { LegalFoldersModule } from '../legal-folders/legal-folders.module';
import { DocumentVersionTokenService } from './application/document-version-token';
import {
  ConfirmDocumentUploadUseCase,
  ConfirmDocumentVersionUseCase,
  PresignDocumentUploadUseCase,
  PresignDocumentVersionUseCase,
} from './application/use-cases/document-upload.use-cases';
import { GetDocumentUseCase } from './application/use-cases/get-document.use-case';
import { UpdateDocumentUseCase } from './application/use-cases/update-document.use-case';
import {
  DeleteDocumentUseCase,
  DuplicateDocumentUseCase,
  MoveDocumentUseCase,
  RestoreDocumentUseCase,
  ToggleDocumentFavoriteUseCase,
} from './application/use-cases/document-lifecycle.use-cases';
import {
  DownloadDocumentUseCase,
  DownloadDocumentVersionUseCase,
  PreviewDocumentUseCase,
} from './application/use-cases/document-download.use-cases';
import { ListDocumentVersionsUseCase } from './application/use-cases/list-document-versions.use-case';
import { ListDocumentsAggregateUseCase } from './application/use-cases/list-documents-aggregate.use-case';
import { DocumentsDashboardSummaryUseCase } from './application/use-cases/documents-dashboard-summary.use-case';
import { UnlinkDocumentUseCase } from './application/use-cases/document-link.use-case';
import {
  CreateFolderUseCase,
  DeleteFolderUseCase,
  ListFolderTreeUseCase,
  RenameMoveFolderUseCase,
  ReorderFolderUseCase,
  RestoreFolderUseCase,
  ToggleFolderFavoriteUseCase,
} from './application/use-cases/folder.use-cases';
import { CreateTagUseCase, ListTagsUseCase } from './application/use-cases/tag.use-cases';
import { DocumentsController } from './presentation/documents.controller';
import { FoldersController } from './presentation/folders.controller';
import { TagsController } from './presentation/tags.controller';

/**
 * Reafirma docs/backend-implementation/00-status.md — módulo Documents/
 * Folders (Sprint 09). Importa `TimelineModule` pelo mesmo motivo de
 * `ClientsModule`/`LegalCasesModule` (Sprint 08): injeta
 * `TimelineRecorderService` para registrar eventos automáticos, nunca
 * escreve em `EventoTimeline` diretamente. `StorageModule`/`ANTIVIRUS_PORT`
 * são `@Global()` (`app.module.ts`), não precisam de import explícito aqui.
 */
@Module({
  imports: [TimelineModule, LegalFoldersModule],
  controllers: [DocumentsController, FoldersController, TagsController],
  providers: [
    DocumentVersionTokenService,
    PresignDocumentUploadUseCase,
    ConfirmDocumentUploadUseCase,
    PresignDocumentVersionUseCase,
    ConfirmDocumentVersionUseCase,
    ListDocumentsAggregateUseCase,
    GetDocumentUseCase,
    UpdateDocumentUseCase,
    DeleteDocumentUseCase,
    RestoreDocumentUseCase,
    DuplicateDocumentUseCase,
    MoveDocumentUseCase,
    ToggleDocumentFavoriteUseCase,
    DownloadDocumentUseCase,
    DownloadDocumentVersionUseCase,
    PreviewDocumentUseCase,
    ListDocumentVersionsUseCase,
    DocumentsDashboardSummaryUseCase,
    UnlinkDocumentUseCase,
    ListFolderTreeUseCase,
    CreateFolderUseCase,
    RenameMoveFolderUseCase,
    ReorderFolderUseCase,
    DeleteFolderUseCase,
    RestoreFolderUseCase,
    ToggleFolderFavoriteUseCase,
    ListTagsUseCase,
    CreateTagUseCase,
  ],
  exports: [DocumentsDashboardSummaryUseCase],
})
export class DocumentsModule {}
