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
  CreateFolderUseCase,
  DeleteFolderUseCase,
  ListFolderTreeUseCase,
  RenameMoveFolderUseCase,
  ReorderFolderUseCase,
  RestoreFolderUseCase,
  ToggleFolderFavoriteUseCase,
} from '../application/use-cases/folder.use-cases';
import {
  createFolderSchema,
  deleteFolderQuerySchema,
  listFoldersQuerySchema,
  reorderFolderSchema,
  updateFolderSchema,
} from './schemas/folder.schemas';

/** Reafirma docs/api/10-documents.md §10.6 — árvore de pastas. */
@ApiTags('Folders')
@Controller('folders')
export class FoldersController {
  constructor(
    private readonly listTree: ListFolderTreeUseCase,
    private readonly createFolder: CreateFolderUseCase,
    private readonly renameMoveFolder: RenameMoveFolderUseCase,
    private readonly reorderFolder: ReorderFolderUseCase,
    private readonly deleteFolder: DeleteFolderUseCase,
    private readonly restoreFolder: RestoreFolderUseCase,
    private readonly toggleFavorite: ToggleFolderFavoriteUseCase,
  ) {}

  @Get()
  @RequirePermission('document:read:assigned')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.listTree.execute(
      user.escritorioId,
      user,
      listFoldersQuerySchema.parse(query),
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CREATE_FOLDER', 'PASTA')
  @Post()
  @RequirePermission('document:folder:manage')
  @UsePipes(new ZodValidationPipe(createFolderSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createFolder.execute(user.escritorioId, body as never, user.membroId);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_FOLDER', 'PASTA')
  @Patch(':id')
  @RequirePermission('document:folder:manage')
  @UsePipes(new ZodValidationPipe(updateFolderSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.renameMoveFolder.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Patch(':id/reorder')
  @RequirePermission('document:folder:manage')
  @UsePipes(new ZodValidationPipe(reorderFolderSchema))
  async reorder(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.reorderFolder.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_FOLDER', 'PASTA')
  @Delete(':id')
  @RequirePermission('document:folder:manage')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Query() query: unknown, @CurrentUser() user: AuthUser) {
    const { cascata } = deleteFolderQuerySchema.parse(query);
    const result = await this.deleteFolder.execute(user.escritorioId, id, cascata);
    if (!result.ok) throw result.error;
  }

  @Audit('RESTORE_FOLDER', 'PASTA')
  @Post(':id/restore')
  @RequirePermission('document:folder:manage')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.restoreFolder.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Post(':id/favorite')
  @RequirePermission('document:read:assigned')
  async favorite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.toggleFavorite.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
