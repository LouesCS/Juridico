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
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import { AcceptInvitationUseCase } from '../application/use-cases/accept-invitation.use-case';
import {
  GrantAccessUseCase,
  RevokeAccessUseCase,
  RevokeAllSessionsUseCase,
} from '../application/use-cases/access-management.use-cases';
import {
  BlockMemberUseCase,
  UnblockMemberUseCase,
} from '../application/use-cases/block-member.use-cases';
import { CreateCollaboratorUseCase } from '../application/use-cases/create-collaborator.use-case';
import { GetCollaboratorUseCase } from '../application/use-cases/get-collaborator.use-case';
import { InviteMemberUseCase } from '../application/use-cases/invite-member.use-case';
import {
  ListInvitationsUseCase,
  ListRolesUseCase,
  ResendInvitationUseCase,
  RevokeInvitationUseCase,
} from '../application/use-cases/invitation-management.use-cases';
import { ListCollaboratorsUseCase } from '../application/use-cases/list-collaborators.use-case';
import { ListMembersUseCase } from '../application/use-cases/list-members.use-case';
import { RemoveMemberUseCase } from '../application/use-cases/remove-member.use-case';
import {
  SuspendMemberUseCase,
  UnsuspendMemberUseCase,
} from '../application/use-cases/suspend-member.use-cases';
import { UpdateCollaboratorUseCase } from '../application/use-cases/update-collaborator.use-case';
import { UpdateMemberRoleUseCase } from '../application/use-cases/update-member-role.use-case';
import {
  acceptInvitationSchema,
  createCollaboratorSchema,
  grantAccessSchema,
  inviteMemberSchema,
  listCollaboratorsQuerySchema,
  updateCollaboratorSchema,
  updateMemberRoleSchema,
} from './schemas/membership.schemas';

@ApiTags('Memberships')
@Controller()
export class MembershipsController {
  constructor(
    private readonly listMembersUseCase: ListMembersUseCase,
    private readonly updateMemberRoleUseCase: UpdateMemberRoleUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly listInvitationsUseCase: ListInvitationsUseCase,
    private readonly resendInvitationUseCase: ResendInvitationUseCase,
    private readonly revokeInvitationUseCase: RevokeInvitationUseCase,
    private readonly acceptInvitationUseCase: AcceptInvitationUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly createCollaboratorUseCase: CreateCollaboratorUseCase,
    private readonly updateCollaboratorUseCase: UpdateCollaboratorUseCase,
    private readonly getCollaboratorUseCase: GetCollaboratorUseCase,
    private readonly listCollaboratorsUseCase: ListCollaboratorsUseCase,
    private readonly blockMemberUseCase: BlockMemberUseCase,
    private readonly unblockMemberUseCase: UnblockMemberUseCase,
    private readonly suspendMemberUseCase: SuspendMemberUseCase,
    private readonly unsuspendMemberUseCase: UnsuspendMemberUseCase,
    private readonly grantAccessUseCase: GrantAccessUseCase,
    private readonly revokeAccessUseCase: RevokeAccessUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
  ) {}

  /**
   * Retrocompatível por construção, não por sorte: nenhum novo query param
   * do módulo Colaboradores tem valor "vazio" que colidiria com "ausente" —
   * quando a query chega literalmente sem nenhuma chave (`{}`), delega para
   * o `ListMembersUseCase` original (mesmo array plano de sempre, usado
   * hoje por telas como o seletor de "Responsável"). Só passa a usar
   * `ListCollaboratorsUseCase` (paginado, `{ items, nextCursor, total }`)
   * quando o chamador de fato envia algum dos novos parâmetros — reafirma
   * "não alterar comportamento de quem não opta pelos novos query params".
   */
  @Get('members')
  @RequirePermission('member:read')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    if (!query || Object.keys(query as object).length === 0) {
      return this.listMembersUseCase.execute(user.escritorioId);
    }
    return this.listCollaboratorsUseCase.execute(
      user.escritorioId,
      listCollaboratorsQuerySchema.parse(query),
    );
  }

  @Get('members/:id')
  @RequirePermission('member:read')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getCollaboratorUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CREATE_COLLABORATOR', 'MEMBRO')
  @Post('members')
  @RequirePermission('member:create')
  @UsePipes(new ZodValidationPipe(createCollaboratorSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createCollaboratorUseCase.execute(
      user.escritorioId,
      user.membroId,
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_COLLABORATOR', 'MEMBRO')
  @Patch('members/:id')
  @RequirePermission('member:update')
  @UsePipes(new ZodValidationPipe(updateCollaboratorSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateCollaboratorUseCase.execute(
      user.escritorioId,
      user.membroId,
      id,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('UPDATE_MEMBER_ROLE', 'MEMBRO')
  @Patch('members/:id/role')
  @RequirePermission('member:update-role')
  @UsePipes(new ZodValidationPipe(updateMemberRoleSchema))
  async updateRole(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { papelId } = body as { papelId: string };
    const result = await this.updateMemberRoleUseCase.execute(
      user.escritorioId,
      user.membroId,
      id,
      papelId,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_MEMBER', 'MEMBRO')
  @Delete('members/:id')
  @RequirePermission('member:remove')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.removeMemberUseCase.execute(user.escritorioId, user.membroId, id);
    if (!result.ok) throw result.error;
    return { desativado: true };
  }

  @Audit('BLOCK_MEMBER', 'MEMBRO')
  @Post('members/:id/block')
  @RequirePermission('member:block')
  async block(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.blockMemberUseCase.execute(user.escritorioId, user.membroId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('UNBLOCK_MEMBER', 'MEMBRO')
  @Post('members/:id/unblock')
  @RequirePermission('member:block')
  async unblock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.unblockMemberUseCase.execute(user.escritorioId, user.membroId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('SUSPEND_MEMBER', 'MEMBRO')
  @Post('members/:id/suspend')
  @RequirePermission('member:block')
  async suspend(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.suspendMemberUseCase.execute(user.escritorioId, user.membroId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('UNSUSPEND_MEMBER', 'MEMBRO')
  @Post('members/:id/unsuspend')
  @RequirePermission('member:block')
  async unsuspend(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.unsuspendMemberUseCase.execute(user.escritorioId, user.membroId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('GRANT_ACCESS', 'MEMBRO')
  @Post('members/:id/grant-access')
  @RequirePermission('member:manage-access')
  @UsePipes(new ZodValidationPipe(grantAccessSchema))
  async grantAccess(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.grantAccessUseCase.execute(
      user.escritorioId,
      user.membroId,
      id,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('REVOKE_ACCESS', 'MEMBRO')
  @Post('members/:id/revoke-access')
  @RequirePermission('member:manage-access')
  async revokeAccess(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.revokeAccessUseCase.execute(user.escritorioId, user.membroId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('REVOKE_ALL_SESSIONS', 'MEMBRO')
  @Delete('members/:id/sessions')
  @RequirePermission('member:manage-access')
  async revokeAllSessions(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.revokeAllSessionsUseCase.execute(
      user.escritorioId,
      user.membroId,
      id,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('INVITE_MEMBER', 'CONVITE')
  @Post('invitations')
  @RequirePermission('member:invite')
  @UsePipes(new ZodValidationPipe(inviteMemberSchema))
  async invite(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.inviteMemberUseCase.execute(user.escritorioId, user.membroId, body as never);
  }

  @Get('invitations')
  @RequirePermission('member:invite')
  async listInvitations(@CurrentUser() user: AuthUser) {
    return this.listInvitationsUseCase.execute(user.escritorioId);
  }

  @Post('invitations/:id/resend')
  @RequirePermission('member:invite')
  async resend(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.resendInvitationUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('REVOKE_INVITATION', 'CONVITE')
  @Delete('invitations/:id')
  @RequirePermission('member:invite')
  async revoke(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.revokeInvitationUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Public()
  @Audit('ACCEPT_INVITATION', 'CONVITE')
  @Post('invitations/:token/accept')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(acceptInvitationSchema))
  async accept(@Param('token') token: string, @Body() body: unknown) {
    const result = await this.acceptInvitationUseCase.execute(token, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get('roles')
  @RequirePermission('member:read')
  async listRoles(@CurrentUser() user: AuthUser) {
    return this.listRolesUseCase.execute(user.escritorioId);
  }
}
