import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  CreateTaskCommentUseCase,
  ListTaskCommentsUseCase,
} from '../application/use-cases/task-comments.use-cases';
import { createTaskCommentSchema } from './schemas/task.schemas';

@ApiTags('Tasks')
@Controller('tasks/:tarefaId/comments')
export class TaskCommentsController {
  constructor(
    private readonly listUseCase: ListTaskCommentsUseCase,
    private readonly createUseCase: CreateTaskCommentUseCase,
  ) {}

  @Get()
  @RequirePermission('task:read:assigned')
  async list(@Param('tarefaId') tarefaId: string, @CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId, tarefaId);
  }

  @Audit('CREATE_TASK_COMMENT', 'TAREFA')
  @Post()
  @RequirePermission('comment:create')
  @UsePipes(new ZodValidationPipe(createTaskCommentSchema))
  async create(
    @Param('tarefaId') tarefaId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.createUseCase.execute(
      user.escritorioId,
      tarefaId,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }
}
