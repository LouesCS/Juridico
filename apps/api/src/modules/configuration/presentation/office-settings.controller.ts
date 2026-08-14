import { Body, Controller, Get, Patch, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  GetAiSettingsUseCase,
  GetFinancialSettingsUseCase,
  GetGeneralSettingsUseCase,
  UpdateAiSettingsUseCase,
  UpdateFinancialSettingsUseCase,
  UpdateGeneralSettingsUseCase,
} from '../application/office-settings.use-cases';
import {
  updateAiSettingsSchema,
  updateFinancialSettingsSchema,
  updateGeneralSettingsSchema,
} from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration')
export class OfficeSettingsController {
  constructor(
    private readonly getGeneral: GetGeneralSettingsUseCase,
    private readonly updateGeneral: UpdateGeneralSettingsUseCase,
    private readonly getFinancial: GetFinancialSettingsUseCase,
    private readonly updateFinancial: UpdateFinancialSettingsUseCase,
    private readonly getAi: GetAiSettingsUseCase,
    private readonly updateAi: UpdateAiSettingsUseCase,
  ) {}

  @Get('general')
  @RequirePermission('configuration:read')
  async general(@CurrentUser() user: AuthUser) {
    return this.getGeneral.execute(user.escritorioId);
  }

  @Audit('UPDATE_GENERAL_SETTINGS', 'CONFIGURACAO_GERAL')
  @Patch('general')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateGeneralSettingsSchema))
  async updateGeneralSettings(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.updateGeneral.execute(user.escritorioId, body as never);
  }

  @Get('financial')
  @RequirePermission('configuration:read')
  async financial(@CurrentUser() user: AuthUser) {
    const result = await this.getFinancial.execute(user.escritorioId, user.permissions);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_FINANCIAL_SETTINGS', 'CONFIGURACAO_FINANCEIRA')
  @Patch('financial')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateFinancialSettingsSchema))
  async updateFinancialSettings(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateFinancial.execute(
      user.escritorioId,
      body as never,
      user.permissions,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get('ai')
  @RequirePermission('configuration:read')
  async ai(@CurrentUser() user: AuthUser) {
    return this.getAi.execute(user.escritorioId);
  }

  @Audit('UPDATE_AI_SETTINGS', 'CONFIGURACAO_IA')
  @Patch('ai')
  @RequirePermission('ai:manage')
  @UsePipes(new ZodValidationPipe(updateAiSettingsSchema))
  async updateAiSettings(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.updateAi.execute(user.escritorioId, body as never);
  }
}
