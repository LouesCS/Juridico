import { Body, Controller, Delete, HttpCode, Param, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  AddDependencyUseCase,
  RemoveDependencyUseCase,
} from '../application/use-cases/task-dependencies.use-cases';
import { addDependencySchema } from './schemas/task.schemas';

@ApiTags('Tasks')
@Controller('tasks/:tarefaId/dependencies')
export class TaskDependenciesController {
  constructor(
    private readonly addUseCase: AddDependencyUseCase,
    private readonly removeUseCase: RemoveDependencyUseCase,
  ) {}

  @Audit('ADD_TASK_DEPENDENCY', 'TAREFA')
  @Post()
  @RequirePermission('task:update')
  @UsePipes(new ZodValidationPipe(addDependencySchema))
  async add(
    @Param('tarefaId') tarefaId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.addUseCase.execute(user.escritorioId, tarefaId, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_TASK_DEPENDENCY', 'TAREFA')
  @Delete(':dependeDeId')
  @RequirePermission('task:update')
  @HttpCode(204)
  async remove(
    @Param('tarefaId') tarefaId: string,
    @Param('dependeDeId') dependeDeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeUseCase.execute(user.escritorioId, tarefaId, dependeDeId);
    if (!result.ok) throw result.error;
  }
}
