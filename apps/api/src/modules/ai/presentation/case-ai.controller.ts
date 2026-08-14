import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import { ListSummariesUseCase } from '../application/use-cases/ai-summary-lifecycle.use-cases';
import { RequestSummaryUseCase } from '../application/use-cases/request-summary.use-case';
import { requestCaseSummarySchema } from './schemas/ai.schemas';

/** Reafirma docs/api/14-ai.md §14.1 — `POST/GET /legal-cases/:id/ai-summaries`. */
@ApiTags('AI')
@Controller('legal-cases/:id/ai-summaries')
export class CaseAiController {
  constructor(
    private readonly requestSummary: RequestSummaryUseCase,
    private readonly listSummaries: ListSummariesUseCase,
  ) {}

  @Audit('REQUEST_AI_SUMMARY', 'RESUMO_IA')
  @Post()
  @RequirePermission('ai:summarize')
  @UsePipes(new ZodValidationPipe(requestCaseSummarySchema))
  async request(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { tipoResumo } = body as {
      tipoResumo: 'GERAL' | 'EXECUTIVO' | 'CRONOLOGICO' | 'PONTOS_CHAVE' | 'RISCOS';
    };
    const result = await this.requestSummary.execute(
      user.escritorioId,
      'PROCESSO',
      id,
      tipoResumo,
      user,
    );
    if (!result.ok) throw result.error;
    return { ...result.value, streamUrl: `/ai-summaries/${result.value.id}/stream` };
  }

  @Get()
  @RequirePermission('ai:summarize')
  async list(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.listSummaries.execute(user.escritorioId, 'PROCESSO', id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
