import { Body, Controller, Get, Param, Post, Sse, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  CancelSummaryUseCase,
  GetSummarySourcesUseCase,
  GetSummaryUseCase,
  RegenerateSummaryUseCase,
  SummaryFeedbackUseCase,
} from '../application/use-cases/ai-summary-lifecycle.use-cases';
import { StreamSummaryUseCase } from '../application/use-cases/stream-summary.use-case';
import { summaryFeedbackSchema } from './schemas/ai.schemas';

/**
 * Reafirma docs/api/14-ai.md — operações por `id` de `ResumoIA`, comuns aos
 * 3 escopos (Processo/Documento/Cliente). Gate uniforme em `ai:summarize`
 * (etapa 1); a etapa 2 (o usuário pode ver ESTE resumo específico) é
 * `assertResumoAccess`, dentro de cada use case — mesmo padrão de 404 nunca
 * 403 já usado em Documents/Legal Cases.
 */
@ApiTags('AI')
@Controller('ai-summaries')
export class AiSummariesController {
  constructor(
    private readonly getSummary: GetSummaryUseCase,
    private readonly getSources: GetSummarySourcesUseCase,
    private readonly regenerate: RegenerateSummaryUseCase,
    private readonly cancel: CancelSummaryUseCase,
    private readonly feedback: SummaryFeedbackUseCase,
    private readonly stream: StreamSummaryUseCase,
  ) {}

  @Get(':id')
  @RequirePermission('ai:summarize')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getSummary.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Sse(':id/stream')
  @RequirePermission('ai:summarize')
  async streamGeneration(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.stream.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('REGENERATE_AI_SUMMARY', 'RESUMO_IA')
  @Post(':id/regenerate')
  @RequirePermission('ai:summarize')
  async regenerateSummary(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.regenerate.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return { ...result.value, streamUrl: `/ai-summaries/${result.value.id}/stream` };
  }

  @Audit('CANCEL_AI_SUMMARY', 'RESUMO_IA')
  @Post(':id/cancel')
  @RequirePermission('ai:summarize')
  async cancelSummary(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.cancel.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
  }

  @Post(':id/feedback')
  @RequirePermission('ai:summarize')
  @UsePipes(new ZodValidationPipe(summaryFeedbackSchema))
  async sendFeedback(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.feedback.execute(user.escritorioId, id, body as never, user);
    if (!result.ok) throw result.error;
  }

  @Get(':id/sources')
  @RequirePermission('ai:summarize')
  async sources(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getSources.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
