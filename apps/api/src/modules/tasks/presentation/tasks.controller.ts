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
import { CreateTaskFromTemplateUseCase } from '../application/use-cases/create-task-from-template.use-case';
import { CreateTaskUseCase } from '../application/use-cases/create-task.use-case';
import { DeleteTaskUseCase } from '../application/use-cases/delete-task.use-case';
import { GetTaskConfigUseCase } from '../application/use-cases/get-task-config.use-case';
import { GetTaskUseCase } from '../application/use-cases/get-task.use-case';
import { ListTasksUseCase } from '../application/use-cases/list-tasks.use-case';
import { TaskDashboardUseCase } from '../application/use-cases/task-dashboard.use-case';
import { ToggleTaskFavoriteUseCase } from '../application/use-cases/task-favorites.use-case';
import {
  ArchiveTaskUseCase,
  CancelTaskUseCase,
  CompleteTaskUseCase,
  DuplicateTaskUseCase,
  MoveTaskUseCase,
  ReopenTaskUseCase,
  RestoreTaskUseCase,
} from '../application/use-cases/task-lifecycle.use-cases';
import { UpdateTaskUseCase } from '../application/use-cases/update-task.use-case';
import {
  cancelTaskSchema,
  createTaskFromTemplateSchema,
  createTaskSchema,
  listTasksQuerySchema,
  moveTaskSchema,
  updateTaskSchema,
} from './schemas/task.schemas';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly getTaskUseCase: GetTaskUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly archiveTaskUseCase: ArchiveTaskUseCase,
    private readonly restoreTaskUseCase: RestoreTaskUseCase,
    private readonly duplicateTaskUseCase: DuplicateTaskUseCase,
    private readonly moveTaskUseCase: MoveTaskUseCase,
    private readonly reopenTaskUseCase: ReopenTaskUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
    private readonly cancelTaskUseCase: CancelTaskUseCase,
    private readonly toggleFavoriteUseCase: ToggleTaskFavoriteUseCase,
    private readonly createFromTemplateUseCase: CreateTaskFromTemplateUseCase,
    private readonly getConfigUseCase: GetTaskConfigUseCase,
    private readonly dashboardUseCase: TaskDashboardUseCase,
  ) {}

  @Get('config')
  @RequirePermission('task:read:assigned')
  async config(@CurrentUser() user: AuthUser) {
    return this.getConfigUseCase.execute(user.escritorioId);
  }

  @Get('dashboard-summary')
  @RequirePermission('task:read:assigned')
  async dashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardUseCase.execute(user.escritorioId, user);
  }

  @Get()
  @RequirePermission('task:read:assigned')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listTasksUseCase.execute(
      user.escritorioId,
      user,
      listTasksQuerySchema.parse(query),
    );
  }

  @Audit('CREATE_TASK', 'TAREFA')
  @Post()
  @RequirePermission('task:create')
  @UsePipes(new ZodValidationPipe(createTaskSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createTaskUseCase.execute(
      user.escritorioId,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CREATE_TASK_FROM_TEMPLATE', 'TAREFA')
  @Post('from-template')
  @RequirePermission('task:create')
  @UsePipes(new ZodValidationPipe(createTaskFromTemplateSchema))
  async createFromTemplate(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createFromTemplateUseCase.execute(
      user.escritorioId,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id')
  @RequirePermission('task:read:assigned')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getTaskUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_TASK', 'TAREFA')
  @Patch(':id')
  @RequirePermission('task:update')
  @UsePipes(new ZodValidationPipe(updateTaskSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateTaskUseCase.execute(
      user.escritorioId,
      id,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_TASK', 'TAREFA')
  @Delete(':id')
  @RequirePermission('task:delete')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteTaskUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('ARCHIVE_TASK', 'TAREFA')
  @Post(':id/archive')
  @RequirePermission('task:update')
  async archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.archiveTaskUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
  }

  @Audit('RESTORE_TASK', 'TAREFA')
  @Post(':id/restore')
  @RequirePermission('task:delete')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.restoreTaskUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
  }

  @Audit('DUPLICATE_TASK', 'TAREFA')
  @Post(':id/duplicate')
  @RequirePermission('task:create')
  async duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.duplicateTaskUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('MOVE_TASK', 'TAREFA')
  @Post(':id/move')
  @RequirePermission('task:update')
  @UsePipes(new ZodValidationPipe(moveTaskSchema))
  async move(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.moveTaskUseCase.execute(
      user.escritorioId,
      id,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('REOPEN_TASK', 'TAREFA')
  @Post(':id/reopen')
  @RequirePermission('task:update')
  async reopen(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.reopenTaskUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
  }

  @Audit('COMPLETE_TASK', 'TAREFA')
  @Post(':id/complete')
  @RequirePermission('task:update')
  async complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.completeTaskUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CANCEL_TASK', 'TAREFA')
  @Post(':id/cancel')
  @RequirePermission('task:update')
  @UsePipes(new ZodValidationPipe(cancelTaskSchema))
  async cancel(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.cancelTaskUseCase.execute(
      user.escritorioId,
      id,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('FAVORITE_TASK', 'TAREFA')
  @Post(':id/favorite')
  @RequirePermission('task:read:assigned')
  async favorite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.toggleFavoriteUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
