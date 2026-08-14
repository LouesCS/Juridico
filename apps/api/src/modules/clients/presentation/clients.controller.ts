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
  ArchiveClientUseCase,
  DuplicateClientUseCase,
  RestoreClientUseCase,
} from '../application/use-cases/client-lifecycle.use-cases';
import { ToggleClientFavoriteUseCase } from '../application/use-cases/client-favorites.use-case';
import { CreateClientUseCase } from '../application/use-cases/create-client.use-case';
import { DeleteClientUseCase } from '../application/use-cases/delete-client.use-case';
import { ExportClientsUseCase } from '../application/use-cases/export-clients.use-case';
import { GetClientUseCase } from '../application/use-cases/get-client.use-case';
import { ListClientLegalCasesUseCase } from '../application/use-cases/list-client-legal-cases.use-case';
import { ListClientsUseCase } from '../application/use-cases/list-clients.use-case';
import { ListClientTimelineUseCase } from '../application/use-cases/list-client-timeline.use-case';
import { UpdateClientUseCase } from '../application/use-cases/update-client.use-case';
import {
  createClientSchema,
  exportClientsQuerySchema,
  listClientsQuerySchema,
  listClientTimelineQuerySchema,
  updateClientSchema,
} from './schemas/client.schemas';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly listClientsUseCase: ListClientsUseCase,
    private readonly createClientUseCase: CreateClientUseCase,
    private readonly getClientUseCase: GetClientUseCase,
    private readonly updateClientUseCase: UpdateClientUseCase,
    private readonly deleteClientUseCase: DeleteClientUseCase,
    private readonly archiveClientUseCase: ArchiveClientUseCase,
    private readonly restoreClientUseCase: RestoreClientUseCase,
    private readonly duplicateClientUseCase: DuplicateClientUseCase,
    private readonly listClientLegalCasesUseCase: ListClientLegalCasesUseCase,
    private readonly toggleClientFavoriteUseCase: ToggleClientFavoriteUseCase,
    private readonly listClientTimelineUseCase: ListClientTimelineUseCase,
    private readonly exportClientsUseCase: ExportClientsUseCase,
  ) {}

  @Get()
  @RequirePermission('client:read')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listClientsUseCase.execute(
      user.escritorioId,
      listClientsQuerySchema.parse(query),
      user.membroId,
    );
  }

  // Declarada antes de `GET /clients/:id` — senão o Nest tentaria casar
  // "export" com o parâmetro `:id`.
  @Get('export')
  @RequirePermission('client:export')
  async export(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.exportClientsUseCase.execute(
      user.escritorioId,
      exportClientsQuerySchema.parse(query),
    );
  }

  @Audit('CREATE_CLIENT', 'CLIENTE')
  @Post()
  @RequirePermission('client:create')
  @UsePipes(new ZodValidationPipe(createClientSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.createClientUseCase.execute(user.escritorioId, body as never);
  }

  @Get(':id')
  @RequirePermission('client:read')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getClientUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id/timeline')
  @RequirePermission('client:read')
  async timeline(@Param('id') id: string, @Query() query: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.listClientTimelineUseCase.execute(
      user.escritorioId,
      id,
      listClientTimelineQuerySchema.parse(query),
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('TOGGLE_CLIENT_FAVORITE', 'CLIENTE')
  @Post(':id/favorite')
  @RequirePermission('client:read')
  async toggleFavorite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.toggleClientFavoriteUseCase.execute(
      user.escritorioId,
      id,
      user.membroId,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_CLIENT', 'CLIENTE')
  @Patch(':id')
  @RequirePermission('client:update')
  @UsePipes(new ZodValidationPipe(updateClientSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateClientUseCase.execute(
      user.escritorioId,
      id,
      body as never,
      user.membroId,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('DELETE_CLIENT', 'CLIENTE')
  @Delete(':id')
  @RequirePermission('client:delete')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteClientUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('ARCHIVE_CLIENT', 'CLIENTE')
  @Post(':id/archive')
  @RequirePermission('client:update')
  async archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.archiveClientUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
  }

  @Audit('RESTORE_CLIENT', 'CLIENTE')
  @Post(':id/restore')
  @RequirePermission('client:delete')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.restoreClientUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
  }

  @Audit('DUPLICATE_CLIENT', 'CLIENTE')
  @Post(':id/duplicate')
  @RequirePermission('client:create')
  async duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.duplicateClientUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id/legal-cases')
  @RequirePermission('client:read')
  async legalCases(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.listClientLegalCasesUseCase.execute(user.escritorioId, id, user);
  }
}
