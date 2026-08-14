import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Audit } from '../../audit/audit-action.decorator';
import { ExtrajudicialMovementsService } from '../application/extrajudicial-movements.service';
import {
  editExtrajudicialMovementSchema,
  listExtrajudicialMovementsSchema,
} from './schemas/extrajudicial-movement.schemas';
@ApiTags('Extrajudicial Movements')
@Controller('extrajudicial-movements')
export class ExtrajudicialMovementsController {
  constructor(private service: ExtrajudicialMovementsService) {}
  @Get() @RequirePermission('extrajudicial-movement:read') list(
    @Query() q: unknown,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.list(u.escritorioId, u.membroId, listExtrajudicialMovementsSchema.parse(q));
  }
  @Get('catalogs') @RequirePermission('extrajudicial-movement:read') catalogs(
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.catalogs(u.escritorioId);
  }
  @Get('export')
  @RequirePermission('extrajudicial-movement:manage')
  @Audit('EXPORT_EXTRAJUDICIAL_MOVEMENTS', 'MOVIMENTACAO_EXTRAJUDICIAL')
  export(@Query() q: unknown, @CurrentUser() u: AuthUser) {
    return this.service.export(
      u.escritorioId,
      u.membroId,
      listExtrajudicialMovementsSchema.parse(q),
    );
  }
  @Get(':id') @RequirePermission('extrajudicial-movement:read') get(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.get(u.escritorioId, u.membroId, id);
  }
  @Patch(':id')
  @RequirePermission('extrajudicial-movement:update')
  @Audit('UPDATE_EXTRAJUDICIAL_MOVEMENT', 'MOVIMENTACAO_EXTRAJUDICIAL')
  update(@Param('id') id: string, @Body() b: unknown, @CurrentUser() u: AuthUser) {
    return this.service.update(
      u.escritorioId,
      u.membroId,
      id,
      editExtrajudicialMovementSchema.parse(b),
    );
  }
  @Post(':id/timeline')
  @RequirePermission('extrajudicial-movement:update')
  @Audit('PUBLISH_EXTRAJUDICIAL_MOVEMENT_TO_FOLDER_TIMELINE', 'MOVIMENTACAO_EXTRAJUDICIAL')
  publishToFolderTimeline(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.publishToFolderTimeline(u.escritorioId, u.membroId, id);
  }
  @Post(':id/favorite')
  @RequirePermission('extrajudicial-movement:update')
  @Audit('FAVORITE_EXTRAJUDICIAL_MOVEMENT', 'MOVIMENTACAO_EXTRAJUDICIAL')
  favorite(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.favorite(u.escritorioId, u.membroId, id);
  }
  @Post(':id/read')
  @RequirePermission('extrajudicial-movement:update')
  @Audit('TOGGLE_READ_EXTRAJUDICIAL_MOVEMENT', 'MOVIMENTACAO_EXTRAJUDICIAL')
  toggleRead(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.toggleRead(u.escritorioId, u.membroId, id);
  }
  @Delete(':id')
  @RequirePermission('extrajudicial-movement:delete')
  @Audit('DELETE_EXTRAJUDICIAL_MOVEMENT', 'MOVIMENTACAO_EXTRAJUDICIAL')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.remove(u.escritorioId, u.membroId, id);
  }
}
