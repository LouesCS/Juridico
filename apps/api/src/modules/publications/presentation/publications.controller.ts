import { Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Audit } from '../../audit/audit-action.decorator';
import { PublicationsService } from '../application/publications.service';
import { listPublicationsSchema } from './schemas/publication.schemas';

@ApiTags('Publications')
@Controller('publications')
export class PublicationsController {
  constructor(private readonly service: PublicationsService) {}
  @Get() @RequirePermission('publication:read') list(
    @Query() query: unknown,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.list(u.escritorioId, u.membroId, listPublicationsSchema.parse(query));
  }
  @Get('export')
  @RequirePermission('publication:manage')
  @Audit('EXPORT_PUBLICATIONS', 'PUBLICACAO')
  export(@Query() query: unknown, @CurrentUser() u: AuthUser) {
    return this.service.export(u.escritorioId, u.membroId, listPublicationsSchema.parse(query));
  }
  @Get(':id') @RequirePermission('publication:read') get(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.get(u.escritorioId, u.membroId, id);
  }
  @Post(':id/viewed')
  @RequirePermission('publication:read')
  @Audit('VIEW_PUBLICATION', 'PUBLICACAO')
  @HttpCode(204)
  viewed(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.viewed(u.escritorioId, u.membroId, id);
  }
  @Post(':id/read')
  @RequirePermission('publication:update')
  @Audit('READ_PUBLICATION', 'PUBLICACAO')
  read(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.markRead(u.escritorioId, u.membroId, id);
  }
  @Post(':id/favorite')
  @RequirePermission('publication:update')
  @Audit('FAVORITE_PUBLICATION', 'PUBLICACAO')
  favorite(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.toggleFavorite(u.escritorioId, u.membroId, id);
  }
  @Delete(':id')
  @RequirePermission('publication:delete')
  @Audit('DELETE_PUBLICATION', 'PUBLICACAO')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.service.remove(u.escritorioId, u.membroId, id);
  }
}
