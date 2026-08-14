import { Module } from '@nestjs/common';
import {
  GetRoleUseCase,
  ListPermissionCatalogUseCase,
} from './application/use-cases/permission-catalog.use-cases';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  UpdateRolePermissionsUseCase,
  UpdateRoleUseCase,
} from './application/use-cases/role-lifecycle.use-cases';
import { PermissionsController } from './presentation/permissions.controller';

/**
 * Tela Administrativa do Permission Engine (Prompt 12) — CRUD de perfis
 * customizados e do catálogo de permissões. Deliberadamente separado de
 * `MembershipsModule` (que continua dono de Membro/Convite) — este módulo
 * é dono de Papel/Permissao/PapelPermissao do ponto de vista de escrita;
 * `AuthorizationModule` (`shared/authorization/`) é quem resolve
 * permissões em tempo de autenticação, os dois nunca se sobrepõem.
 */
@Module({
  controllers: [PermissionsController],
  providers: [
    ListPermissionCatalogUseCase,
    GetRoleUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    UpdateRolePermissionsUseCase,
    DeleteRoleUseCase,
  ],
})
export class PermissionsModule {}
