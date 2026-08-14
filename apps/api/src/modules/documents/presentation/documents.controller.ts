import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  ConfirmDocumentUploadUseCase,
  ConfirmDocumentVersionUseCase,
  PresignDocumentUploadUseCase,
  PresignDocumentVersionUseCase,
} from '../application/use-cases/document-upload.use-cases';
import { GetDocumentUseCase } from '../application/use-cases/get-document.use-case';
import { UpdateDocumentUseCase } from '../application/use-cases/update-document.use-case';
import {
  DeleteDocumentUseCase,
  DuplicateDocumentUseCase,
  MoveDocumentUseCase,
  RestoreDocumentUseCase,
  ToggleDocumentFavoriteUseCase,
} from '../application/use-cases/document-lifecycle.use-cases';
import {
  DownloadDocumentUseCase,
  DownloadDocumentVersionUseCase,
  PreviewDocumentUseCase,
} from '../application/use-cases/document-download.use-cases';
import { ListDocumentVersionsUseCase } from '../application/use-cases/list-document-versions.use-case';
import { ListDocumentsAggregateUseCase } from '../application/use-cases/list-documents-aggregate.use-case';
import { DocumentsDashboardSummaryUseCase } from '../application/use-cases/documents-dashboard-summary.use-case';
import { UnlinkDocumentUseCase } from '../application/use-cases/document-link.use-case';
import {
  confirmDocumentUploadSchema,
  confirmDocumentVersionSchema,
  listDocumentsAggregateQuerySchema,
  moveDocumentSchema,
  presignDocumentUploadSchema,
  presignDocumentVersionSchema,
  updateDocumentSchema,
} from './schemas/document.schemas';

/**
 * Reafirma docs/api/10-documents.md §10.2. `POST/GET .../versions` foi
 * dividido em `/versions/presign` + `/versions/confirm` (em vez de um único
 * endpoint) para reaproveitar exatamente o mesmo fluxo de duas etapas do
 * upload inicial (binário nunca trafega pela API) — desvio pragmático do
 * endpoint único descrito na doc, documentado aqui e em
 * docs/backend-implementation/20-context-next-step.md.
 */
@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly presignUpload: PresignDocumentUploadUseCase,
    private readonly confirmUpload: ConfirmDocumentUploadUseCase,
    private readonly presignVersion: PresignDocumentVersionUseCase,
    private readonly confirmVersion: ConfirmDocumentVersionUseCase,
    private readonly listAggregate: ListDocumentsAggregateUseCase,
    private readonly getDocument: GetDocumentUseCase,
    private readonly updateDocument: UpdateDocumentUseCase,
    private readonly deleteDocument: DeleteDocumentUseCase,
    private readonly restoreDocument: RestoreDocumentUseCase,
    private readonly duplicateDocument: DuplicateDocumentUseCase,
    private readonly moveDocument: MoveDocumentUseCase,
    private readonly toggleFavorite: ToggleDocumentFavoriteUseCase,
    private readonly downloadDocument: DownloadDocumentUseCase,
    private readonly downloadDocumentVersion: DownloadDocumentVersionUseCase,
    private readonly previewDocument: PreviewDocumentUseCase,
    private readonly listVersions: ListDocumentVersionsUseCase,
    private readonly dashboardSummary: DocumentsDashboardSummaryUseCase,
    private readonly unlinkDocument: UnlinkDocumentUseCase,
  ) {}

  @Get()
  @RequirePermission('document:read:assigned')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listAggregate.execute(
      user.escritorioId,
      user,
      listDocumentsAggregateQuerySchema.parse(query),
    );
  }

  // Precisa vir ANTES de `@Get(':id')` — caso contrário o roteador do Nest
  // trataria "dashboard-summary" como um `:id`.
  @Get('dashboard-summary')
  @RequirePermission('document:read:assigned')
  async dashboardSummaryRoute(@CurrentUser() user: AuthUser) {
    return this.dashboardSummary.execute(user.escritorioId, user);
  }

  @Audit('CREATE_DOCUMENT', 'DOCUMENTO', {
    acao: 'LINK_DOCUMENT_TO_LEGAL_FOLDER',
    recursoTipo: 'PASTA_JURIDICA',
    recursoIdOrigem: 'body',
    recursoIdCampo: 'resourceId',
  })
  @Post('presign')
  @RequirePermission('document:create')
  @UsePipes(new ZodValidationPipe(presignDocumentUploadSchema))
  async presign(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.presignUpload.execute(
      user.escritorioId,
      body as never,
      user.membroId,
      user,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CONFIRM_DOCUMENT_UPLOAD', 'DOCUMENTO')
  @Post(':id/confirm')
  @RequirePermission('document:create')
  @UsePipes(new ZodValidationPipe(confirmDocumentUploadSchema))
  async confirm(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.confirmUpload.execute(
      user.escritorioId,
      id,
      body as never,
      user.membroId,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id')
  @RequirePermission('document:read:assigned')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getDocument.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UNLINK_DOCUMENT_FROM_LEGAL_FOLDER', 'DOCUMENTO', {
    acao: 'UNLINK_DOCUMENT_FROM_LEGAL_FOLDER',
    recursoTipo: 'PASTA_JURIDICA',
    recursoIdOrigem: 'params',
    recursoIdCampo: 'folderId',
  })
  @Delete(':id/links/legal-folder/:folderId')
  @RequirePermission('document:update')
  @HttpCode(204)
  async unlinkLegalFolder(
    @Param('id') id: string,
    @Param('folderId') folderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.unlinkDocument.execute(user.escritorioId, id, folderId, user);
    if (!result.ok) throw result.error;
  }

  @Audit('UPDATE_DOCUMENT', 'DOCUMENTO')
  @Patch(':id')
  @RequirePermission('document:update')
  @UsePipes(new ZodValidationPipe(updateDocumentSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateDocument.execute(user.escritorioId, id, body as never, user);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_DOCUMENT', 'DOCUMENTO')
  @Delete(':id')
  @RequirePermission('document:delete')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteDocument.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
  }

  @Audit('RESTORE_DOCUMENT', 'DOCUMENTO')
  @Post(':id/restore')
  @RequirePermission('document:delete')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.restoreDocument.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
  }

  @Audit('DUPLICATE_DOCUMENT', 'DOCUMENTO')
  @Post(':id/duplicate')
  @RequirePermission('document:update')
  async duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.duplicateDocument.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('MOVE_DOCUMENT', 'DOCUMENTO')
  @Patch(':id/move')
  @RequirePermission('document:update')
  @UsePipes(new ZodValidationPipe(moveDocumentSchema))
  async move(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.moveDocument.execute(user.escritorioId, id, body as never, user);
    if (!result.ok) throw result.error;
  }

  @Audit('TOGGLE_DOCUMENT_FAVORITE', 'DOCUMENTO')
  @Post(':id/favorite')
  @RequirePermission('document:update')
  async favorite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.toggleFavorite.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id/download')
  @Audit('DOWNLOAD_DOCUMENT', 'DOCUMENTO')
  @RequirePermission('document:download')
  async download(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.downloadDocument.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id/preview')
  @RequirePermission('document:read:assigned')
  async preview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.previewDocument.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id/versions')
  @RequirePermission('document:read:assigned')
  async versions(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.listVersions.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id/versions/:versaoId/download')
  @Audit('DOWNLOAD_DOCUMENT_VERSION', 'DOCUMENTO')
  @RequirePermission('document:download')
  async downloadVersion(
    @Param('id') id: string,
    @Param('versaoId') versaoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.downloadDocumentVersion.execute(
      user.escritorioId,
      id,
      versaoId,
      user,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Post(':id/versions/presign')
  @RequirePermission('document:update')
  @UsePipes(new ZodValidationPipe(presignDocumentVersionSchema))
  async presignNewVersion(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.presignVersion.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CONFIRM_DOCUMENT_VERSION', 'DOCUMENTO')
  @Post(':id/versions/confirm')
  @RequirePermission('document:update')
  @UsePipes(new ZodValidationPipe(confirmDocumentVersionSchema))
  async confirmNewVersion(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.confirmVersion.execute(
      user.escritorioId,
      id,
      body as never,
      user.membroId,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }
}
