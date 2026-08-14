import { Body, Controller, Delete, Get, Param, Patch, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  GetRoleUseCase,
  ListPermissionCatalogUseCase,
} from '../application/use-cases/permission-catalog.use-cases';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  UpdateRolePermissionsUseCase,
  UpdateRoleUseCase,
} from '../application/use-cases/role-lifecycle.use-cases';
import {
  createRoleSchema,
  updateRolePermissionsSchema,
  updateRoleSchema,
} from './schemas/permissions.schemas';

/**
 * Tela Administrativa do Permission Engine (Prompt 12) — todas as rotas
 * gated por `role:manage`, uma permissão nova e independente de
 * `member:*` (editar perfis e permissões é uma responsabilidade diferente
 * de convidar/remover membros, já coberta por `MembershipsModule`).
 * `GET /roles` (listagem simples) já existe em `MembershipsModule`
 * (`ListRolesUseCase`, gated por `member:read`) — não duplicado aqui.
 */
@ApiTags('Permissions')
@Controller()
export class PermissionsController {
  constructor(
    private readonly listPermissionCatalogUseCase: ListPermissionCatalogUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @Get('permissions')
  @RequirePermission('role:manage')
  async listCatalog() {
    return this.listPermissionCatalogUseCase.execute();
  }

  @Get('roles/:id')
  @RequirePermission('role:manage')
  async getRole(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getRoleUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CREATE_ROLE', 'PAPEL')
  @Post('roles')
  @RequirePermission('role:manage')
  @UsePipes(new ZodValidationPipe(createRoleSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createRoleUseCase.execute(
      user.escritorioId,
      user.membroId,
      user.permissions,
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_ROLE', 'PAPEL')
  @Patch('roles/:id')
  @RequirePermission('role:manage')
  @UsePipes(new ZodValidationPipe(updateRoleSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateRoleUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('UPDATE_ROLE_PERMISSIONS', 'PAPEL')
  @Patch('roles/:id/permissions')
  @RequirePermission('role:manage')
  @UsePipes(new ZodValidationPipe(updateRolePermissionsSchema))
  async updatePermissions(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.updateRolePermissionsUseCase.execute(
      user.escritorioId,
      id,
      user.permissions,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_ROLE', 'PAPEL')
  @Delete('roles/:id')
  @RequirePermission('role:manage')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteRoleUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }
}
