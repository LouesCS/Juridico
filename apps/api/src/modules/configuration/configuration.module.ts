import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import {
  CreateCargoUseCase,
  DeleteCargoUseCase,
  ListCargosUseCase,
  UpdateCargoUseCase,
} from './application/cargos.use-cases';
import { ConfigurationDashboardUseCase } from './application/configuration-dashboard.use-case';
import {
  AddCollaboratorGroupMemberUseCase,
  CreateCollaboratorGroupUseCase,
  DeleteCollaboratorGroupUseCase,
  ListCollaboratorGroupsUseCase,
  RemoveCollaboratorGroupMemberUseCase,
  UpdateCollaboratorGroupUseCase,
} from './application/collaborator-groups.use-cases';
import {
  CreateExtraFieldUseCase,
  DeleteExtraFieldUseCase,
  ListExtraFieldsUseCase,
  UpdateExtraFieldUseCase,
} from './application/extra-fields.use-cases';
import {
  CreateHolidayUseCase,
  DeleteHolidayUseCase,
  ListHolidaysUseCase,
  UpdateHolidayUseCase,
} from './application/holidays.use-cases';
import {
  GetAiSettingsUseCase,
  GetFinancialSettingsUseCase,
  GetGeneralSettingsUseCase,
  UpdateAiSettingsUseCase,
  UpdateFinancialSettingsUseCase,
  UpdateGeneralSettingsUseCase,
} from './application/office-settings.use-cases';
import {
  BulkUpdateRequiredFieldsUseCase,
  ListRequiredFieldsUseCase,
} from './application/required-fields.use-cases';
import {
  CreateTaskCategoryUseCase,
  DeleteTaskCategoryUseCase,
  ListTaskCategoriesUseCase,
  UpdateTaskCategoryUseCase,
} from './application/task-categories.use-cases';
import {
  CreateTaskTemplateUseCase,
  DeleteTaskTemplateUseCase,
  ListTaskTemplatesUseCase,
  UpdateTaskTemplateUseCase,
} from './application/task-templates.use-cases';
import {
  AddValueSetItemUseCase,
  CreateValueSetUseCase,
  DeleteValueSetUseCase,
  GetValueSetUseCase,
  ListValueSetsUseCase,
  RemoveValueSetItemUseCase,
  UpdateValueSetItemUseCase,
  UpdateValueSetUseCase,
} from './application/value-sets.use-cases';
import { CargosController } from './presentation/cargos.controller';
import { CollaboratorGroupsController } from './presentation/collaborator-groups.controller';
import { ConfigurationDashboardController } from './presentation/configuration-dashboard.controller';
import { ExtraFieldsController } from './presentation/extra-fields.controller';
import { HolidaysController } from './presentation/holidays.controller';
import { OfficeSettingsController } from './presentation/office-settings.controller';
import { RequiredFieldsController } from './presentation/required-fields.controller';
import { TaskCategoriesController } from './presentation/task-categories.controller';
import { TaskTemplatesController } from './presentation/task-templates.controller';
import { ValueSetsController } from './presentation/value-sets.controller';

/**
 * Configuration Engine (Sprint 13 / Prompt 13) — motor central de
 * parametrização, ver docs/backend-implementation/22-configuration-engine.md.
 * Importa `AiModule` só para reaproveitar `AiUsageUseCase`/`AiQuotaService`
 * (Dashboard das Configurações e aba IA), nunca duplica a lógica de cota.
 */
@Module({
  imports: [AiModule],
  controllers: [
    OfficeSettingsController,
    ExtraFieldsController,
    RequiredFieldsController,
    ValueSetsController,
    TaskCategoriesController,
    CollaboratorGroupsController,
    CargosController,
    TaskTemplatesController,
    HolidaysController,
    ConfigurationDashboardController,
  ],
  providers: [
    GetGeneralSettingsUseCase,
    UpdateGeneralSettingsUseCase,
    GetFinancialSettingsUseCase,
    UpdateFinancialSettingsUseCase,
    GetAiSettingsUseCase,
    UpdateAiSettingsUseCase,
    ListExtraFieldsUseCase,
    CreateExtraFieldUseCase,
    UpdateExtraFieldUseCase,
    DeleteExtraFieldUseCase,
    ListRequiredFieldsUseCase,
    BulkUpdateRequiredFieldsUseCase,
    ListValueSetsUseCase,
    GetValueSetUseCase,
    CreateValueSetUseCase,
    UpdateValueSetUseCase,
    DeleteValueSetUseCase,
    AddValueSetItemUseCase,
    UpdateValueSetItemUseCase,
    RemoveValueSetItemUseCase,
    ListTaskCategoriesUseCase,
    CreateTaskCategoryUseCase,
    UpdateTaskCategoryUseCase,
    DeleteTaskCategoryUseCase,
    ListCollaboratorGroupsUseCase,
    CreateCollaboratorGroupUseCase,
    UpdateCollaboratorGroupUseCase,
    DeleteCollaboratorGroupUseCase,
    AddCollaboratorGroupMemberUseCase,
    RemoveCollaboratorGroupMemberUseCase,
    ListCargosUseCase,
    CreateCargoUseCase,
    UpdateCargoUseCase,
    DeleteCargoUseCase,
    ListTaskTemplatesUseCase,
    CreateTaskTemplateUseCase,
    UpdateTaskTemplateUseCase,
    DeleteTaskTemplateUseCase,
    ListHolidaysUseCase,
    CreateHolidayUseCase,
    UpdateHolidayUseCase,
    DeleteHolidayUseCase,
    ConfigurationDashboardUseCase,
  ],
})
export class ConfigurationModule {}
