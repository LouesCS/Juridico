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
  AddCollaboratorGroupMemberUseCase,
  CreateCollaboratorGroupUseCase,
  DeleteCollaboratorGroupUseCase,
  ListCollaboratorGroupsUseCase,
  RemoveCollaboratorGroupMemberUseCase,
  UpdateCollaboratorGroupUseCase,
} from '../application/collaborator-groups.use-cases';
import {
  addGroupMemberSchema,
  createCollaboratorGroupSchema,
  updateCollaboratorGroupSchema,
} from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration/collaborator-groups')
export class CollaboratorGroupsController {
  constructor(
    private readonly listUseCase: ListCollaboratorGroupsUseCase,
    private readonly createUseCase: CreateCollaboratorGroupUseCase,
    private readonly updateUseCase: UpdateCollaboratorGroupUseCase,
    private readonly deleteUseCase: DeleteCollaboratorGroupUseCase,
    private readonly addMemberUseCase: AddCollaboratorGroupMemberUseCase,
    private readonly removeMemberUseCase: RemoveCollaboratorGroupMemberUseCase,
  ) {}

  @Get()
  @RequirePermission('configuration:read')
  async list(@CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId);
  }

  @Audit('CREATE_COLLABORATOR_GROUP', 'GRUPO_COLABORADORES')
  @Post()
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(createCollaboratorGroupSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createUseCase.execute(user.escritorioId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_COLLABORATOR_GROUP', 'GRUPO_COLABORADORES')
  @Patch(':id')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateCollaboratorGroupSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_COLLABORATOR_GROUP', 'GRUPO_COLABORADORES')
  @Delete(':id')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('ADD_COLLABORATOR_GROUP_MEMBER', 'GRUPO_COLABORADORES')
  @Post(':id/members')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(addGroupMemberSchema))
  async addMember(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.addMemberUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_COLLABORATOR_GROUP_MEMBER', 'GRUPO_COLABORADORES')
  @Delete(':id/members/:membroId')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async removeMember(
    @Param('id') id: string,
    @Param('membroId') membroId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeMemberUseCase.execute(user.escritorioId, id, membroId);
    if (!result.ok) throw result.error;
  }
}
