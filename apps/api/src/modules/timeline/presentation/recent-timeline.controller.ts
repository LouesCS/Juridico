import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListRecentTimelineAggregateUseCase } from '../application/use-cases/list-recent-timeline-aggregate.use-case';

/**
 * Rota agregada `/v1/timeline` (Sprint 08) — sustenta "Últimas atividades"
 * e "Timeline resumida" do Dashboard, mesmo racional de `/v1/deadlines`
 * (docs/api/09-legal-cases.md §9.4): agregado cross-processo, não uma
 * sub-rota de um processo específico.
 */
@ApiTags('Timeline')
@Controller('timeline')
export class RecentTimelineController {
  constructor(
    private readonly listRecentTimelineAggregateUseCase: ListRecentTimelineAggregateUseCase,
  ) {}

  @Get()
  @RequirePermission('case:read:assigned')
  async list(@Query('limit') limit: string | undefined, @CurrentUser() user: AuthUser) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    return this.listRecentTimelineAggregateUseCase.execute(user.escritorioId, user, parsedLimit);
  }
}
