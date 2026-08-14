import { Body, Controller, Delete, Get, HttpCode, Patch, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import { DeleteOfficeUseCase } from '../application/use-cases/delete-office.use-case';
import { GetOfficeUseCase } from '../application/use-cases/get-office.use-case';
import { UpdateOfficeUseCase } from '../application/use-cases/update-office.use-case';
import { deleteOfficeSchema, updateOfficeSchema } from './schemas/office.schemas';

@ApiTags('Offices')
@Controller('office')
export class OfficesController {
  constructor(
    private readonly getOfficeUseCase: GetOfficeUseCase,
    private readonly updateOfficeUseCase: UpdateOfficeUseCase,
    private readonly deleteOfficeUseCase: DeleteOfficeUseCase,
  ) {}

  @Get()
  @RequirePermission('office:read')
  async get(@CurrentUser() user: AuthUser) {
    return this.getOfficeUseCase.execute(user.escritorioId);
  }

  @Audit('UPDATE_OFFICE', 'ESCRITORIO')
  @Patch()
  @RequirePermission('office:update')
  @UsePipes(new ZodValidationPipe(updateOfficeSchema))
  async update(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.updateOfficeUseCase.execute(user.escritorioId, body as never);
  }

  @Audit('DELETE_OFFICE', 'ESCRITORIO')
  @Delete()
  @HttpCode(202)
  @RequirePermission('office:delete')
  @UsePipes(new ZodValidationPipe(deleteOfficeSchema))
  async remove(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { confirmacaoNome } = body as { confirmacaoNome: string };
    const result = await this.deleteOfficeUseCase.execute(user.escritorioId, confirmacaoNome);
    if (!result.ok) throw result.error;
    return { encerrando: true };
  }
}
