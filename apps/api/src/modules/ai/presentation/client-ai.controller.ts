import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Audit } from '../../audit/audit-action.decorator';
import { ListSummariesUseCase } from '../application/use-cases/ai-summary-lifecycle.use-cases';
import { RequestSummaryUseCase } from '../application/use-cases/request-summary.use-case';

/** Reafirma Sprint 11 §"IA DO CLIENTE" ("Histórico Inteligente") — extensão além de docs/api/14-ai.md. */
@ApiTags('AI')
@Controller('clients/:id/ai-summaries')
export class ClientAiController {
  constructor(
    private readonly requestSummary: RequestSummaryUseCase,
    private readonly listSummaries: ListSummariesUseCase,
  ) {}

  @Audit('REQUEST_AI_SUMMARY', 'RESUMO_IA')
  @Post()
  @RequirePermission('ai:summarize')
  async request(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.requestSummary.execute(
      user.escritorioId,
      'CLIENTE',
      id,
      undefined,
      user,
    );
    if (!result.ok) throw result.error;
    return { ...result.value, streamUrl: `/ai-summaries/${result.value.id}/stream` };
  }

  @Get()
  @RequirePermission('ai:summarize')
  async list(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.listSummaries.execute(user.escritorioId, 'CLIENTE', id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
