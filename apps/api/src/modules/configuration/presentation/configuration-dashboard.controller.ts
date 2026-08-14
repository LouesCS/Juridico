import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ConfigurationDashboardUseCase } from '../application/configuration-dashboard.use-case';

@ApiTags('Configuration')
@Controller('configuration/dashboard-summary')
export class ConfigurationDashboardController {
  constructor(private readonly useCase: ConfigurationDashboardUseCase) {}

  @Get()
  @RequirePermission('configuration:read')
  async summary(@CurrentUser() user: AuthUser) {
    return this.useCase.execute(user.escritorioId);
  }
}
