import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Audit } from '../../audit/audit-action.decorator';
import { RequestsService } from '../application/requests.service';
import { listRequestsSchema, requestBodySchema, updateRequestSchema } from './schemas/request.schemas';
@Controller('requests')
export class RequestsController {
 constructor(private readonly service:RequestsService){}
 @Get() @RequirePermission('request:read') list(@Query() q:unknown,@CurrentUser() u:AuthUser){return this.service.list(u.escritorioId,listRequestsSchema.parse(q));}
 @Get('options') @RequirePermission('request:read') options(@CurrentUser() u:AuthUser){return this.service.options(u.escritorioId);}
 @Get('export') @RequirePermission('request:export') @Audit('EXPORT_REQUESTS','PEDIDO') export(@Query() q:unknown,@CurrentUser() u:AuthUser){return this.service.export(u.escritorioId,listRequestsSchema.parse(q));}
 @Get(':id') @RequirePermission('request:read') get(@Param('id') id:string,@CurrentUser() u:AuthUser){return this.service.get(u.escritorioId,id);}
 @Post() @RequirePermission('request:create') @Audit('CREATE_REQUEST','PEDIDO') create(@Body() b:unknown,@CurrentUser() u:AuthUser){return this.service.create(u.escritorioId,requestBodySchema.parse(b));}
 @Patch(':id') @RequirePermission('request:update') @Audit('UPDATE_REQUEST','PEDIDO') update(@Param('id') id:string,@Body() b:unknown,@CurrentUser() u:AuthUser){return this.service.update(u.escritorioId,id,updateRequestSchema.parse(b));}
 @Delete(':id') @HttpCode(204) @RequirePermission('request:delete') @Audit('DELETE_REQUEST','PEDIDO') remove(@Param('id') id:string,@CurrentUser() u:AuthUser){return this.service.remove(u.escritorioId,id);}
}
