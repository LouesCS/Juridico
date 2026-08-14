import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import { ListSummariesUseCase } from '../application/use-cases/ai-summary-lifecycle.use-cases';
import { RequestSummaryUseCase } from '../application/use-cases/request-summary.use-case';
import { requestTaskSummarySchema } from './schemas/ai.schemas';

/**
 * Reafirma docs/backend-implementation/23-task-engine.md §23.8 — 5 ações
 * de IA de Tarefa (Resumo/Checklist/Próximos passos/Descrição/Contexto),
 * mesmo endpoint genérico `POST/GET /tasks/:id/ai-summaries` das outras 3
 * entidades (`CaseAiController`/`DocumentAiController`/`ClientAiController`),
 * nenhuma rota nem serviço de IA duplicado.
 */
@ApiTags('AI')
@Controller('tasks/:id/ai-summaries')
export class TaskAiController {
  constructor(
    private readonly requestSummary: RequestSummaryUseCase,
    private readonly listSummaries: ListSummariesUseCase,
  ) {}

  @Audit('REQUEST_AI_SUMMARY', 'RESUMO_IA')
  @Post()
  @RequirePermission('ai:summarize')
  @UsePipes(new ZodValidationPipe(requestTaskSummarySchema))
  async request(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { tipoResumo } = body as {
      tipoResumo?:
        | 'TAREFA_RESUMO'
        | 'TAREFA_CHECKLIST'
        | 'TAREFA_PROXIMOS_PASSOS'
        | 'TAREFA_DESCRICAO'
        | 'TAREFA_CONTEXTO';
    };
    const result = await this.requestSummary.execute(
      user.escritorioId,
      'TAREFA',
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
    const result = await this.listSummaries.execute(user.escritorioId, 'TAREFA', id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
