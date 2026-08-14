import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  CreateTaskTemplateUseCase,
  DeleteTaskTemplateUseCase,
  ListTaskTemplatesUseCase,
  UpdateTaskTemplateUseCase,
} from '../application/task-templates.use-cases';
import {
  createTaskTemplateSchema,
  updateTaskTemplateSchema,
} from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration/task-templates')
export class TaskTemplatesController {
  constructor(
    private readonly listUseCase: ListTaskTemplatesUseCase,
    private readonly createUseCase: CreateTaskTemplateUseCase,
    private readonly updateUseCase: UpdateTaskTemplateUseCase,
    private readonly deleteUseCase: DeleteTaskTemplateUseCase,
  ) {}

  @Get()
  @RequirePermission('configuration:read')
  async list(@CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId);
  }

  @Audit('CREATE_TASK_TEMPLATE', 'MODELO_TAREFA')
  @Post()
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(createTaskTemplateSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createUseCase.execute(user.escritorioId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_TASK_TEMPLATE', 'MODELO_TAREFA')
  @Patch(':id')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateTaskTemplateSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_TASK_TEMPLATE', 'MODELO_TAREFA')
  @Delete(':id')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }
}
