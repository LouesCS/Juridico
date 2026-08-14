import { Body, Controller, Delete, HttpCode, Param, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  AddTaskLinkUseCase,
  RemoveTaskLinkUseCase,
} from '../application/use-cases/task-links.use-cases';
import { addTaskLinkSchema } from './schemas/task.schemas';

@ApiTags('Tasks')
@Controller('tasks/:tarefaId/links')
export class TaskLinksController {
  constructor(
    private readonly addUseCase: AddTaskLinkUseCase,
    private readonly removeUseCase: RemoveTaskLinkUseCase,
  ) {}

  @Audit('ADD_TASK_LINK', 'TAREFA')
  @Post()
  @RequirePermission('task:update')
  @UsePipes(new ZodValidationPipe(addTaskLinkSchema))
  async add(
    @Param('tarefaId') tarefaId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.addUseCase.execute(user.escritorioId, tarefaId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('REMOVE_TASK_LINK', 'TAREFA')
  @Delete(':vinculoId')
  @RequirePermission('task:update')
  @HttpCode(204)
  async remove(
    @Param('tarefaId') tarefaId: string,
    @Param('vinculoId') vinculoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeUseCase.execute(user.escritorioId, tarefaId, vinculoId);
    if (!result.ok) throw result.error;
  }
}
