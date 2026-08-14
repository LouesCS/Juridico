import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListDeadlinesAggregateUseCase } from '../application/use-cases/list-deadlines-aggregate.use-case';
import { listDeadlinesAggregateQuerySchema } from './schemas/legal-case.schemas';

/**
 * Rota separada de `LegalCasesController` — `/v1/deadlines` é um agregado
 * cross-processo (docs/api/09-legal-cases.md §9.4), não uma sub-rota de um
 * processo específico.
 */
@ApiTags('LegalCases')
@Controller('deadlines')
export class DeadlinesController {
  constructor(private readonly listDeadlinesAggregateUseCase: ListDeadlinesAggregateUseCase) {}

  @Get()
  @RequirePermission('case:read:assigned')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listDeadlinesAggregateUseCase.execute(
      user.escritorioId,
      user,
      listDeadlinesAggregateQuerySchema.parse(query),
    );
  }
}
