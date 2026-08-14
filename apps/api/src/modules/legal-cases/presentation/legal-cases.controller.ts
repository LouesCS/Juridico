import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import {
  AddCaseTeamMemberUseCase,
  ChangeCaseResponsibleUseCase,
  ListCaseTeamUseCase,
  RemoveCaseTeamMemberUseCase,
} from '../application/use-cases/case-team.use-cases';
import {
  AddCasePartyUseCase,
  ListCasePartiesUseCase,
  RemoveCasePartyUseCase,
  UpdateCasePartyUseCase,
} from '../application/use-cases/case-parties.use-cases';
import {
  CancelCaseDeadlineUseCase,
  CompleteCaseDeadlineUseCase,
  CreateCaseDeadlineUseCase,
  DuplicateCaseDeadlineUseCase,
  ListCaseDeadlinesUseCase,
  ReopenCaseDeadlineUseCase,
  UpdateCaseDeadlineUseCase,
} from '../application/use-cases/case-deadlines.use-cases';
import { CreateLegalCaseUseCase } from '../application/use-cases/create-legal-case.use-case';
import { GetLegalCaseUseCase } from '../application/use-cases/get-legal-case.use-case';
import {
  ArchiveLegalCaseUseCase,
  DeleteLegalCaseUseCase,
  RestoreLegalCaseUseCase,
} from '../application/use-cases/legal-case-lifecycle.use-cases';
import { ListLegalCasesUseCase } from '../application/use-cases/list-legal-cases.use-case';
import { UpdateLegalCaseUseCase } from '../application/use-cases/update-legal-case.use-case';
import { UpdateExtrajudicialAggregateUseCase } from '../application/use-cases/update-extrajudicial-aggregate.use-case';
import { UpdateJudicialAggregateUseCase } from '../application/use-cases/update-judicial-aggregate.use-case';
import {
  addCaseTeamMemberSchema,
  cancelCaseDeadlineSchema,
  changeCaseResponsibleSchema,
  createCaseDeadlineSchema,
  createCasePartySchema,
  createLegalCaseSchema,
  listLegalCasesQuerySchema,
  listLegalCasePartyOptionsQuerySchema,
  updateCaseDeadlineSchema,
  updateCasePartySchema,
  updateLegalCaseSchema,
  updateExtrajudicialAggregateSchema,
  updateJudicialAggregateSchema,
} from './schemas/legal-case.schemas';

@ApiTags('LegalCases')
@Controller('legal-cases')
export class LegalCasesController {
  constructor(
    private readonly listLegalCasesUseCase: ListLegalCasesUseCase,
    private readonly createLegalCaseUseCase: CreateLegalCaseUseCase,
    private readonly getLegalCaseUseCase: GetLegalCaseUseCase,
    private readonly updateLegalCaseUseCase: UpdateLegalCaseUseCase,
    private readonly updateExtrajudicialAggregateUseCase: UpdateExtrajudicialAggregateUseCase,
    private readonly updateJudicialAggregateUseCase: UpdateJudicialAggregateUseCase,
    private readonly deleteLegalCaseUseCase: DeleteLegalCaseUseCase,
    private readonly archiveLegalCaseUseCase: ArchiveLegalCaseUseCase,
    private readonly restoreLegalCaseUseCase: RestoreLegalCaseUseCase,
    private readonly listCaseTeamUseCase: ListCaseTeamUseCase,
    private readonly addCaseTeamMemberUseCase: AddCaseTeamMemberUseCase,
    private readonly changeCaseResponsibleUseCase: ChangeCaseResponsibleUseCase,
    private readonly removeCaseTeamMemberUseCase: RemoveCaseTeamMemberUseCase,
    private readonly listCasePartiesUseCase: ListCasePartiesUseCase,
    private readonly addCasePartyUseCase: AddCasePartyUseCase,
    private readonly updateCasePartyUseCase: UpdateCasePartyUseCase,
    private readonly removeCasePartyUseCase: RemoveCasePartyUseCase,
    private readonly listCaseDeadlinesUseCase: ListCaseDeadlinesUseCase,
    private readonly createCaseDeadlineUseCase: CreateCaseDeadlineUseCase,
    private readonly updateCaseDeadlineUseCase: UpdateCaseDeadlineUseCase,
    private readonly cancelCaseDeadlineUseCase: CancelCaseDeadlineUseCase,
    private readonly completeCaseDeadlineUseCase: CompleteCaseDeadlineUseCase,
    private readonly reopenCaseDeadlineUseCase: ReopenCaseDeadlineUseCase,
    private readonly duplicateCaseDeadlineUseCase: DuplicateCaseDeadlineUseCase,
  ) {}

  @Get()
  @RequirePermission('case:read:assigned')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listLegalCasesUseCase.execute(
      user.escritorioId,
      user,
      listLegalCasesQuerySchema.parse(query),
    );
  }

  @Get('party-options')
  @RequirePermission('case:read:assigned')
  partyOptions(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.listLegalCasesUseCase.listPartyOptions(
      user.escritorioId,
      user,
      listLegalCasePartyOptionsQuerySchema.parse(query),
    );
  }

  @Audit('CREATE_LEGAL_CASE', 'PROCESSO')
  @Post()
  @RequirePermission('case:create')
  @UsePipes(new ZodValidationPipe(createLegalCaseSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createLegalCaseUseCase.execute(
      user.escritorioId,
      body as never,
      user.membroId,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Get(':id')
  @RequirePermission('case:read:assigned')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getLegalCaseUseCase.execute(user.escritorioId, id, user);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_LEGAL_CASE', 'PROCESSO')
  @Patch(':id/extrajudicial')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(updateExtrajudicialAggregateSchema))
  async updateExtrajudicial(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!ifMatch || Number.isNaN(Number(ifMatch)))
      throw new BadRequestException('Header If-Match com a versão atual é obrigatório.');
    const result = await this.updateExtrajudicialAggregateUseCase.execute(
      user.escritorioId,
      id,
      Number(ifMatch),
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_LEGAL_CASE', 'PROCESSO')
  @Patch(':id/judicial')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(updateJudicialAggregateSchema))
  async updateJudicial(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!ifMatch || Number.isNaN(Number(ifMatch)))
      throw new BadRequestException('Header If-Match com a versão atual é obrigatório.');
    const result = await this.updateJudicialAggregateUseCase.execute(
      user.escritorioId,
      id,
      Number(ifMatch),
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_LEGAL_CASE', 'PROCESSO')
  @Patch(':id')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(updateLegalCaseSchema))
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!ifMatch || Number.isNaN(Number(ifMatch))) {
      throw new BadRequestException('Header If-Match com a versão atual é obrigatório.');
    }
    const result = await this.updateLegalCaseUseCase.execute(
      user.escritorioId,
      id,
      Number(ifMatch),
      body as never,
      user.membroId,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('DELETE_LEGAL_CASE', 'PROCESSO')
  @Delete(':id')
  @RequirePermission('case:delete')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteLegalCaseUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('ARCHIVE_LEGAL_CASE', 'PROCESSO')
  @Post(':id/archive')
  @RequirePermission('case:update')
  async archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.archiveLegalCaseUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
  }

  @Audit('RESTORE_LEGAL_CASE', 'PROCESSO')
  @Post(':id/restore')
  @RequirePermission('case:delete')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.restoreLegalCaseUseCase.execute(user.escritorioId, id, user.membroId);
    if (!result.ok) throw result.error;
  }

  // ---------------------------------------------------------------------
  // Equipe (docs/api/09-legal-cases.md §9.2)
  // ---------------------------------------------------------------------

  @Get(':id/team')
  @RequirePermission('case:read:assigned')
  async listTeam(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.listCaseTeamUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('ADD_CASE_TEAM_MEMBER', 'PROCESSO')
  @Post(':id/team')
  @RequirePermission('case:team:manage')
  @UsePipes(new ZodValidationPipe(addCaseTeamMemberSchema))
  async addTeamMember(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.addCaseTeamMemberUseCase.execute(
      user.escritorioId,
      id,
      body as never,
      user.membroId,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CHANGE_CASE_RESPONSIBLE', 'PROCESSO')
  @Patch(':id/responsible')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(changeCaseResponsibleSchema))
  async changeResponsible(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const { membroId } = body as { membroId: string };
    const result = await this.changeCaseResponsibleUseCase.execute(
      user.escritorioId,
      id,
      membroId,
      user.membroId,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_CASE_TEAM_MEMBER', 'PROCESSO')
  @Delete(':id/team/:membroId')
  @RequirePermission('case:team:manage')
  async removeTeamMember(
    @Param('id') id: string,
    @Param('membroId') membroId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeCaseTeamMemberUseCase.execute(
      user.escritorioId,
      id,
      membroId,
      user.membroId,
    );
    if (!result.ok) throw result.error;
  }

  // ---------------------------------------------------------------------
  // Participantes (docs/api/09-legal-cases.md §9.3)
  // ---------------------------------------------------------------------

  @Get(':id/parties')
  @RequirePermission('case:read:assigned')
  async listParties(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.listCasePartiesUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('ADD_CASE_PARTY', 'PROCESSO')
  @Post(':id/parties')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(createCasePartySchema))
  async addParty(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.addCasePartyUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_CASE_PARTY', 'PROCESSO')
  @Patch(':id/parties/:parteId')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(updateCasePartySchema))
  async updateParty(
    @Param('id') id: string,
    @Param('parteId') parteId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.updateCasePartyUseCase.execute(
      user.escritorioId,
      id,
      parteId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_CASE_PARTY', 'PROCESSO')
  @Delete(':id/parties/:parteId')
  @RequirePermission('case:update')
  async removeParty(
    @Param('id') id: string,
    @Param('parteId') parteId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeCasePartyUseCase.execute(user.escritorioId, id, parteId);
    if (!result.ok) throw result.error;
  }

  // ---------------------------------------------------------------------
  // Prazos do processo (docs/api/09-legal-cases.md §9.4)
  // ---------------------------------------------------------------------

  @Get(':id/deadlines')
  @RequirePermission('case:read:assigned')
  async listDeadlines(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.listCaseDeadlinesUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CREATE_CASE_DEADLINE', 'PRAZO')
  @Post(':id/deadlines')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(createCaseDeadlineSchema))
  async createDeadline(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.createCaseDeadlineUseCase.execute(
      user.escritorioId,
      id,
      body as never,
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_CASE_DEADLINE', 'PRAZO')
  @Patch(':id/deadlines/:prazoId')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(updateCaseDeadlineSchema))
  async updateDeadline(
    @Param('id') id: string,
    @Param('prazoId') prazoId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.updateCaseDeadlineUseCase.execute(
      user.escritorioId,
      id,
      prazoId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('CANCEL_CASE_DEADLINE', 'PRAZO')
  @Delete(':id/deadlines/:prazoId')
  @RequirePermission('case:update')
  @UsePipes(new ZodValidationPipe(cancelCaseDeadlineSchema))
  async cancelDeadline(
    @Param('id') id: string,
    @Param('prazoId') prazoId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.cancelCaseDeadlineUseCase.execute(
      user.escritorioId,
      id,
      prazoId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('COMPLETE_CASE_DEADLINE', 'PRAZO')
  @Post(':id/deadlines/:prazoId/complete')
  @RequirePermission('case:update')
  async completeDeadline(
    @Param('id') id: string,
    @Param('prazoId') prazoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.completeCaseDeadlineUseCase.execute(user.escritorioId, id, prazoId);
    if (!result.ok) throw result.error;
  }

  @Audit('REOPEN_CASE_DEADLINE', 'PRAZO')
  @Post(':id/deadlines/:prazoId/reopen')
  @RequirePermission('case:update')
  async reopenDeadline(
    @Param('id') id: string,
    @Param('prazoId') prazoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.reopenCaseDeadlineUseCase.execute(user.escritorioId, id, prazoId);
    if (!result.ok) throw result.error;
  }

  @Audit('DUPLICATE_CASE_DEADLINE', 'PRAZO')
  @Post(':id/deadlines/:prazoId/duplicate')
  @RequirePermission('case:update')
  async duplicateDeadline(
    @Param('id') id: string,
    @Param('prazoId') prazoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.duplicateCaseDeadlineUseCase.execute(user.escritorioId, id, prazoId);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
