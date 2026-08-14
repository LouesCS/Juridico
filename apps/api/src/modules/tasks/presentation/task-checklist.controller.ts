import { Body, Controller, Delete, HttpCode, Param, Patch, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  AddChecklistItemUseCase,
  RemoveChecklistItemUseCase,
  UpdateChecklistItemUseCase,
} from '../application/use-cases/task-checklist.use-cases';
import { addChecklistItemSchema, updateChecklistItemSchema } from './schemas/task.schemas';

@ApiTags('Tasks')
@Controller('tasks/:tarefaId/checklist')
export class TaskChecklistController {
  constructor(
    private readonly addUseCase: AddChecklistItemUseCase,
    private readonly updateUseCase: UpdateChecklistItemUseCase,
    private readonly removeUseCase: RemoveChecklistItemUseCase,
  ) {}

  @Audit('ADD_TASK_CHECKLIST_ITEM', 'TAREFA')
  @Post()
  @RequirePermission('task:update')
  @UsePipes(new ZodValidationPipe(addChecklistItemSchema))
  async add(
    @Param('tarefaId') tarefaId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.addUseCase.execute(user.escritorioId, tarefaId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_TASK_CHECKLIST_ITEM', 'TAREFA')
  @Patch(':itemId')
  @RequirePermission('task:update')
  @UsePipes(new ZodValidationPipe(updateChecklistItemSchema))
  async update(
    @Param('tarefaId') tarefaId: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.updateUseCase.execute(
      user.escritorioId,
      tarefaId,
      itemId,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_TASK_CHECKLIST_ITEM', 'TAREFA')
  @Delete(':itemId')
  @RequirePermission('task:update')
  @HttpCode(204)
  async remove(
    @Param('tarefaId') tarefaId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeUseCase.execute(user.escritorioId, tarefaId, itemId);
    if (!result.ok) throw result.error;
  }
}
