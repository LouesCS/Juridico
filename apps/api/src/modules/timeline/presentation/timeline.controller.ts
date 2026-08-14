import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  CreateManualTimelineEventUseCase,
  DeleteManualTimelineEventUseCase,
  UpdateManualTimelineEventUseCase,
} from '../application/use-cases/manual-timeline-event.use-cases';
import { ListCaseTimelineUseCase } from '../application/use-cases/list-case-timeline.use-case';
import {
  createManualTimelineEventSchema,
  listCaseTimelineQuerySchema,
  updateManualTimelineEventSchema,
} from './schemas/timeline.schemas';

@ApiTags('Timeline')
@Controller('legal-cases/:id/timeline')
export class TimelineController {
  constructor(
    private readonly listCaseTimelineUseCase: ListCaseTimelineUseCase,
    private readonly createManualTimelineEventUseCase: CreateManualTimelineEventUseCase,
    private readonly updateManualTimelineEventUseCase: UpdateManualTimelineEventUseCase,
    private readonly deleteManualTimelineEventUseCase: DeleteManualTimelineEventUseCase,
  ) {}

  @Get()
  @RequirePermission('case:read:assigned')
  async list(@Param('id') id: string, @Query() query: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.listCaseTimelineUseCase.execute(
      user.escritorioId,
      id,
      listCaseTimelineQuerySchema.parse(query),
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CREATE_TIMELINE_EVENT', 'EVENTO_TIMELINE')
  @Post()
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(createManualTimelineEventSchema))
  async create(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createManualTimelineEventUseCase.execute(
      user.escritorioId,
      id,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_TIMELINE_EVENT', 'EVENTO_TIMELINE')
  @Patch(':eventoId')
  @RequirePermission('case:read:assigned')
  @UsePipes(new ZodValidationPipe(updateManualTimelineEventSchema))
  async update(
    @Param('id') id: string,
    @Param('eventoId') eventoId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.updateManualTimelineEventUseCase.execute(
      user.escritorioId,
      id,
      eventoId,
      { membroId: user.membroId, podeEditarQualquer: user.permissions.includes('case:update') },
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_TIMELINE_EVENT', 'EVENTO_TIMELINE')
  @Delete(':eventoId')
  @RequirePermission('case:read:assigned')
  async remove(
    @Param('id') id: string,
    @Param('eventoId') eventoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.deleteManualTimelineEventUseCase.execute(
      user.escritorioId,
      id,
      eventoId,
      { membroId: user.membroId, podeEditarQualquer: user.permissions.includes('case:update') },
    );
    if (!result.ok) throw result.error;
  }
}
