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
  CreateExtraFieldUseCase,
  DeleteExtraFieldUseCase,
  ListExtraFieldsUseCase,
  UpdateExtraFieldUseCase,
} from '../application/extra-fields.use-cases';
import {
  createExtraFieldSchema,
  listByEntidadeQuerySchema,
  updateExtraFieldSchema,
} from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration/extra-fields')
export class ExtraFieldsController {
  constructor(
    private readonly listUseCase: ListExtraFieldsUseCase,
    private readonly createUseCase: CreateExtraFieldUseCase,
    private readonly updateUseCase: UpdateExtraFieldUseCase,
    private readonly deleteUseCase: DeleteExtraFieldUseCase,
  ) {}

  @Get()
  @RequirePermission('configuration:read')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId, listByEntidadeQuerySchema.parse(query));
  }

  @Audit('CREATE_EXTRA_FIELD', 'CAMPO_EXTRA')
  @Post()
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(createExtraFieldSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createUseCase.execute(user.escritorioId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_EXTRA_FIELD', 'CAMPO_EXTRA')
  @Patch(':id')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateExtraFieldSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_EXTRA_FIELD', 'CAMPO_EXTRA')
  @Delete(':id')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }
}
