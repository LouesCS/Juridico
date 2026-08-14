import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { AiUsageUseCase } from '../application/use-cases/ai-usage.use-case';

/** Reafirma docs/api/14-ai.md §14.7 — `GET /office/ai-usage`. */
@ApiTags('AI')
@Controller('office')
export class AiUsageController {
  constructor(private readonly aiUsage: AiUsageUseCase) {}

  @Get('ai-usage')
  @RequirePermission('ai:usage:read')
  async usage(@CurrentUser() user: AuthUser) {
    return this.aiUsage.execute(user.escritorioId);
  }
}
