import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  CreateCargoUseCase,
  DeleteCargoUseCase,
  ListCargosUseCase,
  UpdateCargoUseCase,
} from '../application/cargos.use-cases';
import { createCargoSchema, updateCargoSchema } from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration/cargos')
export class CargosController {
  constructor(
    private readonly listUseCase: ListCargosUseCase,
    private readonly createUseCase: CreateCargoUseCase,
    private readonly updateUseCase: UpdateCargoUseCase,
    private readonly deleteUseCase: DeleteCargoUseCase,
  ) {}

  @Get()
  @RequirePermission('configuration:read')
  async list(@CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId);
  }

  @Audit('CREATE_CARGO', 'CARGO')
  @Post()
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(createCargoSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createUseCase.execute(user.escritorioId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_CARGO', 'CARGO')
  @Patch(':id')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateCargoSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_CARGO', 'CARGO')
  @Delete(':id')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }
}
