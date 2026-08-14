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
  CreateTaskCategoryUseCase,
  DeleteTaskCategoryUseCase,
  ListTaskCategoriesUseCase,
  UpdateTaskCategoryUseCase,
} from '../application/task-categories.use-cases';
import {
  createTaskCategorySchema,
  updateTaskCategorySchema,
} from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration/task-categories')
export class TaskCategoriesController {
  constructor(
    private readonly listUseCase: ListTaskCategoriesUseCase,
    private readonly createUseCase: CreateTaskCategoryUseCase,
    private readonly updateUseCase: UpdateTaskCategoryUseCase,
    private readonly deleteUseCase: DeleteTaskCategoryUseCase,
  ) {}

  @Get()
  @RequirePermission('configuration:read')
  async list(@CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId);
  }

  @Audit('CREATE_TASK_CATEGORY', 'CATEGORIA_TAREFA')
  @Post()
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(createTaskCategorySchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createUseCase.execute(user.escritorioId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_TASK_CATEGORY', 'CATEGORIA_TAREFA')
  @Patch(':id')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateTaskCategorySchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_TASK_CATEGORY', 'CATEGORIA_TAREFA')
  @Delete(':id')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }
}
