import { Body, Controller, Get, Param, Patch, Post, Query, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import { LegalFoldersService } from '../application/legal-folders.service';
import {
  createLegalFolderSchema,
  listLegalFoldersSchema,
  updateLegalFolderSchema,
} from './schemas/legal-folder.schemas';

@ApiTags('LegalFolders')
@Controller('legal-folders')
export class LegalFoldersController {
  constructor(private readonly service: LegalFoldersService) {}

  @Get()
  @RequirePermission('legal-folder:read:assigned')
  list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.service.list(user, listLegalFoldersSchema.parse(query));
  }

  @Get('options')
  @RequirePermission('legal-folder:read:assigned')
  options(@CurrentUser() user: AuthUser) {
    return this.service.options(user.escritorioId);
  }

  @Get(':id')
  @RequirePermission('legal-folder:read:assigned')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.get(user, id);
  }

  @Post()
  @RequirePermission('legal-folder:create')
  @Audit('CREATE_LEGAL_FOLDER', 'PASTA_JURIDICA')
  @UsePipes(new ZodValidationPipe(createLegalFolderSchema))
  create(@Body() body: never, @CurrentUser() user: AuthUser) {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @RequirePermission('legal-folder:update')
  @Audit('UPDATE_LEGAL_FOLDER', 'PASTA_JURIDICA')
  @UsePipes(new ZodValidationPipe(updateLegalFolderSchema))
  update(@Param('id') id: string, @Body() body: never, @CurrentUser() user: AuthUser) {
    return this.service.update(user, id, body);
  }

  @Post(':id/complete')
  @RequirePermission('legal-folder:update')
  @Audit('COMPLETE_LEGAL_FOLDER', 'PASTA_JURIDICA')
  complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.complete(user, id);
  }

  @Post(':id/copy')
  @RequirePermission('legal-folder:create')
  @Audit('COPY_LEGAL_FOLDER', 'PASTA_JURIDICA')
  copy(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.copy(user, id);
  }

  @Post(':id/archive')
  @RequirePermission('legal-folder:delete')
  @Audit('ARCHIVE_LEGAL_FOLDER', 'PASTA_JURIDICA')
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.archive(user, id);
  }
}
