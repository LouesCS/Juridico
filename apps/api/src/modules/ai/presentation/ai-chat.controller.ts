import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AiChatUseCase } from '../application/use-cases/ai-chat.use-case';
import { DashboardInsightsUseCase } from '../application/use-cases/dashboard-insights.use-case';
import { chatSchema } from './schemas/ai.schemas';

/**
 * Reafirma Sprint 11 §"CHAT JURÍDICO"/§"IA DO DASHBOARD". `dashboard-insights`
 * usa `office:read` (não `ai:summarize`) — não é uma chamada ao provedor de
 * IA, só agregação determinística (ver `DashboardInsightsUseCase`).
 */
@ApiTags('AI')
@Controller('ai')
export class AiChatController {
  constructor(
    private readonly chat: AiChatUseCase,
    private readonly dashboardInsights: DashboardInsightsUseCase,
  ) {}

  @Post('chat')
  @RequirePermission('ai:summarize')
  @UsePipes(new ZodValidationPipe(chatSchema))
  async ask(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.chat.execute(user.escritorioId, body as never, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get('dashboard-insights')
  @RequirePermission('office:read')
  async insights(@CurrentUser() user: AuthUser) {
    return this.dashboardInsights.execute(user.escritorioId, user);
  }
}
