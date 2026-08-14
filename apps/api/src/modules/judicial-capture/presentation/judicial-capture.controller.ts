import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import { JudicialCaptureService } from '../application/judicial-capture.service';
import {
  createCaptureSchema,
  listCaptureSchema,
  updateCaptureSchema,
} from './schemas/judicial-capture.schemas';

@ApiTags('JudicialCapture')
@Controller('capture-configurations')
export class JudicialCaptureController {
  constructor(private readonly service: JudicialCaptureService) {}

  @Get()
  @RequirePermission('capture:read')
  list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.service.list(user.escritorioId, listCaptureSchema.parse(query), user);
  }

  @Get(':id')
  @RequirePermission('capture:read')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.get(user.escritorioId, id);
  }

  @Post('verify')
  @RequirePermission('capture:create')
  @Audit('VERIFY_CAPTURE_PROCESS', 'CONFIGURACAO_CAPTURA')
  verify(@Body() body: { numeroCnj: string }, @CurrentUser() user: AuthUser) {
    return this.service.verify(user.escritorioId, body.numeroCnj);
  }

  @Post()
  @RequirePermission('capture:create')
  @Audit('CREATE_CAPTURE_CONFIGURATION', 'CONFIGURACAO_CAPTURA')
  @UsePipes(new ZodValidationPipe(createCaptureSchema))
  create(@Body() body: never, @CurrentUser() user: AuthUser) {
    return this.service.create(user.escritorioId, body);
  }

  @Patch(':id')
  @RequirePermission('capture:update')
  @Audit('UPDATE_CAPTURE_CONFIGURATION', 'CONFIGURACAO_CAPTURA')
  @UsePipes(new ZodValidationPipe(updateCaptureSchema))
  update(@Param('id') id: string, @Body() body: never, @CurrentUser() user: AuthUser) {
    return this.service.update(user.escritorioId, id, body);
  }

  @Post(':id/sync')
  @RequirePermission('capture:sync')
  @Audit('SYNC_CAPTURE_CONFIGURATION', 'CONFIGURACAO_CAPTURA')
  sync(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.sync(user.escritorioId, id, user.membroId);
  }

  @Delete(':id')
  @RequirePermission('capture:delete')
  @Audit('DELETE_CAPTURE_CONFIGURATION', 'CONFIGURACAO_CAPTURA')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(user.escritorioId, id);
  }
}
