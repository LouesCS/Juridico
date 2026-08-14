import { Body, Controller, Delete, HttpCode, Param, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  AddResponsavelAuxiliarUseCase,
  RemoveResponsavelAuxiliarUseCase,
} from '../application/use-cases/task-responsibles.use-cases';
import { addResponsavelAuxiliarSchema } from './schemas/task.schemas';

@ApiTags('Tasks')
@Controller('tasks/:tarefaId/responsibles')
export class TaskResponsiblesController {
  constructor(
    private readonly addUseCase: AddResponsavelAuxiliarUseCase,
    private readonly removeUseCase: RemoveResponsavelAuxiliarUseCase,
  ) {}

  @Audit('ADD_TASK_RESPONSIBLE', 'TAREFA')
  @Post()
  @RequirePermission('task:team:manage')
  @UsePipes(new ZodValidationPipe(addResponsavelAuxiliarSchema))
  async add(
    @Param('tarefaId') tarefaId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.addUseCase.execute(user.escritorioId, tarefaId, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_TASK_RESPONSIBLE', 'TAREFA')
  @Delete(':membroId')
  @RequirePermission('task:team:manage')
  @HttpCode(204)
  async remove(
    @Param('tarefaId') tarefaId: string,
    @Param('membroId') membroId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeUseCase.execute(user.escritorioId, tarefaId, membroId);
    if (!result.ok) throw result.error;
  }
}
