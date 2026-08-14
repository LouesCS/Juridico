import { Body, Controller, Get, Patch, Query, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  BulkUpdateRequiredFieldsUseCase,
  ListRequiredFieldsUseCase,
} from '../application/required-fields.use-cases';
import {
  bulkUpdateRequiredFieldsSchema,
  listByEntidadeQuerySchema,
} from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration/required-fields')
export class RequiredFieldsController {
  constructor(
    private readonly listUseCase: ListRequiredFieldsUseCase,
    private readonly bulkUpdateUseCase: BulkUpdateRequiredFieldsUseCase,
  ) {}

  @Get()
  @RequirePermission('configuration:read')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId, listByEntidadeQuerySchema.parse(query));
  }

  @Audit('UPDATE_REQUIRED_FIELDS', 'CAMPO_OBRIGATORIO')
  @Patch()
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(bulkUpdateRequiredFieldsSchema))
  async bulkUpdate(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.bulkUpdateUseCase.execute(user.escritorioId, body as never);
  }
}
