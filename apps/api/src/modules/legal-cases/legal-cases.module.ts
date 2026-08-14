import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import {
  AddCasePartyUseCase,
  ListCasePartiesUseCase,
  RemoveCasePartyUseCase,
  UpdateCasePartyUseCase,
} from './application/use-cases/case-parties.use-cases';
import {
  AddCaseTeamMemberUseCase,
  ChangeCaseResponsibleUseCase,
  ListCaseTeamUseCase,
  RemoveCaseTeamMemberUseCase,
} from './application/use-cases/case-team.use-cases';
import {
  CancelCaseDeadlineUseCase,
  CompleteCaseDeadlineUseCase,
  CreateCaseDeadlineUseCase,
  DuplicateCaseDeadlineUseCase,
  ListCaseDeadlinesUseCase,
  ReopenCaseDeadlineUseCase,
  UpdateCaseDeadlineUseCase,
} from './application/use-cases/case-deadlines.use-cases';
import { CreateLegalCaseUseCase } from './application/use-cases/create-legal-case.use-case';
import { GetLegalCaseUseCase } from './application/use-cases/get-legal-case.use-case';
import {
  ArchiveLegalCaseUseCase,
  DeleteLegalCaseUseCase,
  RestoreLegalCaseUseCase,
} from './application/use-cases/legal-case-lifecycle.use-cases';
import { ListDeadlinesAggregateUseCase } from './application/use-cases/list-deadlines-aggregate.use-case';
import { ListLegalCasesUseCase } from './application/use-cases/list-legal-cases.use-case';
import { UpdateLegalCaseUseCase } from './application/use-cases/update-legal-case.use-case';
import { UpdateExtrajudicialAggregateUseCase } from './application/use-cases/update-extrajudicial-aggregate.use-case';
import { UpdateJudicialAggregateUseCase } from './application/use-cases/update-judicial-aggregate.use-case';
import { DeadlinesController } from './presentation/deadlines.controller';
import { LegalCasesController } from './presentation/legal-cases.controller';

@Module({
  imports: [TimelineModule],
  controllers: [LegalCasesController, DeadlinesController],
  providers: [
    ListLegalCasesUseCase,
    CreateLegalCaseUseCase,
    GetLegalCaseUseCase,
    UpdateLegalCaseUseCase,
    UpdateExtrajudicialAggregateUseCase,
    UpdateJudicialAggregateUseCase,
    DeleteLegalCaseUseCase,
    ArchiveLegalCaseUseCase,
    RestoreLegalCaseUseCase,
    ListCaseTeamUseCase,
    AddCaseTeamMemberUseCase,
    ChangeCaseResponsibleUseCase,
    RemoveCaseTeamMemberUseCase,
    ListCasePartiesUseCase,
    AddCasePartyUseCase,
    UpdateCasePartyUseCase,
    RemoveCasePartyUseCase,
    ListCaseDeadlinesUseCase,
    CreateCaseDeadlineUseCase,
    UpdateCaseDeadlineUseCase,
    CancelCaseDeadlineUseCase,
    CompleteCaseDeadlineUseCase,
    ReopenCaseDeadlineUseCase,
    DuplicateCaseDeadlineUseCase,
    ListDeadlinesAggregateUseCase,
  ],
})
export class LegalCasesModule {}
