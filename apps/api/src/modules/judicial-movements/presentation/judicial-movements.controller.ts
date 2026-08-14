import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Audit } from '../../audit/audit-action.decorator';
import { JudicialMovementsService } from '../application/judicial-movements.service';
import {
  linkJudicialMovementProcessSchema,
  listJudicialMovementsSchema,
} from './schemas/judicial-movement.schemas';

@ApiTags('Judicial Movements')
@Controller('judicial-movements')
export class JudicialMovementsController {
  constructor(private readonly service: JudicialMovementsService) {}

  @Get()
  @RequirePermission('movement:read')
  list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.service.list(
      user.escritorioId,
      user.membroId,
      listJudicialMovementsSchema.parse(query),
    );
  }

  @Get('export')
  @RequirePermission('movement:manage')
  @Audit('EXPORT_JUDICIAL_MOVEMENTS', 'MOVIMENTACAO_JUDICIAL')
  export(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.service.export(
      user.escritorioId,
      user.membroId,
      listJudicialMovementsSchema.parse(query),
    );
  }

  @Get(':id')
  @RequirePermission('movement:read')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.get(user.escritorioId, user.membroId, id);
  }

  @Post(':id/viewed')
  @RequirePermission('movement:read')
  @Audit('VIEW_JUDICIAL_MOVEMENT', 'MOVIMENTACAO_JUDICIAL')
  @HttpCode(204)
  viewed(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.viewed(user.escritorioId, user.membroId, id);
  }

  @Post(':id/favorite')
  @RequirePermission('movement:update')
  @Audit('FAVORITE_JUDICIAL_MOVEMENT', 'MOVIMENTACAO_JUDICIAL')
  favorite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.toggleFavorite(user.escritorioId, user.membroId, id);
  }

  @Post(':id/read')
  @RequirePermission('movement:update')
  @Audit('TOGGLE_JUDICIAL_MOVEMENT_READ', 'MOVIMENTACAO_JUDICIAL')
  read(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.toggleRead(user.escritorioId, user.membroId, id);
  }

  @Post(':id/timeline')
  @RequirePermission('movement:update')
  @Audit('ADD_JUDICIAL_MOVEMENT_TO_FOLDER_TIMELINE', 'MOVIMENTACAO_JUDICIAL')
  timeline(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.publishToFolderTimeline(user.escritorioId, user.membroId, id);
  }

  @Patch(':id/process')
  @RequirePermission('movement:update')
  @Audit('LINK_JUDICIAL_MOVEMENT_PROCESS', 'MOVIMENTACAO_JUDICIAL')
  linkProcess(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.service.linkProcess(
      user.escritorioId,
      user.membroId,
      id,
      linkJudicialMovementProcessSchema.parse(body).processoId,
    );
  }
}
