import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListTaskTimelineUseCase } from '../application/use-cases/list-task-timeline.use-case';
import { listTaskTimelineQuerySchema } from './schemas/task.schemas';

@ApiTags('Tasks')
@Controller('tasks/:tarefaId/timeline')
export class TaskTimelineController {
  constructor(private readonly listUseCase: ListTaskTimelineUseCase) {}

  @Get()
  @RequirePermission('task:read:assigned')
  async list(
    @Param('tarefaId') tarefaId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.listUseCase.execute(
      user.escritorioId,
      tarefaId,
      listTaskTimelineQuerySchema.parse(query),
    );
    if (!result.ok) throw result.error;
    return result.value;
  }
}
