import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { AcceptInvitationUseCase } from './application/use-cases/accept-invitation.use-case';
import {
  GrantAccessUseCase,
  RevokeAccessUseCase,
  RevokeAllSessionsUseCase,
} from './application/use-cases/access-management.use-cases';
import {
  BlockMemberUseCase,
  UnblockMemberUseCase,
} from './application/use-cases/block-member.use-cases';
import { CreateCollaboratorUseCase } from './application/use-cases/create-collaborator.use-case';
import { GetCollaboratorUseCase } from './application/use-cases/get-collaborator.use-case';
import { InviteMemberUseCase } from './application/use-cases/invite-member.use-case';
import {
  ListInvitationsUseCase,
  ListRolesUseCase,
  ResendInvitationUseCase,
  RevokeInvitationUseCase,
} from './application/use-cases/invitation-management.use-cases';
import { ListCollaboratorsUseCase } from './application/use-cases/list-collaborators.use-case';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { RemoveMemberUseCase } from './application/use-cases/remove-member.use-case';
import {
  SuspendMemberUseCase,
  UnsuspendMemberUseCase,
} from './application/use-cases/suspend-member.use-cases';
import { UpdateCollaboratorUseCase } from './application/use-cases/update-collaborator.use-case';
import { UpdateMemberRoleUseCase } from './application/use-cases/update-member-role.use-case';
import { MembershipsController } from './presentation/memberships.controller';

@Module({
  imports: [TimelineModule],
  controllers: [MembershipsController],
  providers: [
    ListMembersUseCase,
    UpdateMemberRoleUseCase,
    RemoveMemberUseCase,
    InviteMemberUseCase,
    ListInvitationsUseCase,
    ResendInvitationUseCase,
    RevokeInvitationUseCase,
    AcceptInvitationUseCase,
    ListRolesUseCase,
    CreateCollaboratorUseCase,
    UpdateCollaboratorUseCase,
    GetCollaboratorUseCase,
    ListCollaboratorsUseCase,
    BlockMemberUseCase,
    UnblockMemberUseCase,
    SuspendMemberUseCase,
    UnsuspendMemberUseCase,
    GrantAccessUseCase,
    RevokeAccessUseCase,
    RevokeAllSessionsUseCase,
  ],
})
export class MembershipsModule {}
