import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { CreateTaskFromTemplateUseCase } from './application/use-cases/create-task-from-template.use-case';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { DeleteTaskUseCase } from './application/use-cases/delete-task.use-case';
import { GetTaskConfigUseCase } from './application/use-cases/get-task-config.use-case';
import { GetTaskUseCase } from './application/use-cases/get-task.use-case';
import { ListTasksUseCase } from './application/use-cases/list-tasks.use-case';
import { ListTaskTimelineUseCase } from './application/use-cases/list-task-timeline.use-case';
import {
  AddChecklistItemUseCase,
  RemoveChecklistItemUseCase,
  UpdateChecklistItemUseCase,
} from './application/use-cases/task-checklist.use-cases';
import {
  CreateTaskCommentUseCase,
  ListTaskCommentsUseCase,
} from './application/use-cases/task-comments.use-cases';
import { TaskDashboardUseCase } from './application/use-cases/task-dashboard.use-case';
import {
  AddDependencyUseCase,
  RemoveDependencyUseCase,
} from './application/use-cases/task-dependencies.use-cases';
import { ToggleTaskFavoriteUseCase } from './application/use-cases/task-favorites.use-case';
import {
  ArchiveTaskUseCase,
  CancelTaskUseCase,
  CompleteTaskUseCase,
  DuplicateTaskUseCase,
  MoveTaskUseCase,
  ReopenTaskUseCase,
  RestoreTaskUseCase,
} from './application/use-cases/task-lifecycle.use-cases';
import {
  AddTaskLinkUseCase,
  RemoveTaskLinkUseCase,
} from './application/use-cases/task-links.use-cases';
import {
  AddResponsavelAuxiliarUseCase,
  RemoveResponsavelAuxiliarUseCase,
} from './application/use-cases/task-responsibles.use-cases';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { TaskValueSetsService } from './application/task-value-sets.service';
import { TaskChecklistController } from './presentation/task-checklist.controller';
import { TaskCommentsController } from './presentation/task-comments.controller';
import { TaskDependenciesController } from './presentation/task-dependencies.controller';
import { TaskLinksController } from './presentation/task-links.controller';
import { TaskResponsiblesController } from './presentation/task-responsibles.controller';
import { TaskTimelineController } from './presentation/task-timeline.controller';
import { TasksController } from './presentation/tasks.controller';

/**
 * Task Engine (Prompt 14) — reafirma
 * docs/backend-implementation/23-task-engine.md. Importa só `TimelineModule`
 * (registro automático de eventos); Configuration Engine (Conjuntos de
 * Valores/Categorias/Modelos/Feriados) e Membro/Equipe são acessados via
 * `PrismaService` diretamente (colunas soltas, módulos desacoplados — ver
 * nota no schema), nunca via import de módulo Nest, exatamente como
 * `Processo.responsavelPrincipalId` já fazia.
 */
@Module({
  imports: [TimelineModule],
  controllers: [
    TasksController,
    TaskChecklistController,
    TaskDependenciesController,
    TaskLinksController,
    TaskResponsiblesController,
    TaskCommentsController,
    TaskTimelineController,
  ],
  providers: [
    TaskValueSetsService,
    ListTasksUseCase,
    ListTaskTimelineUseCase,
    CreateTaskUseCase,
    GetTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    ArchiveTaskUseCase,
    RestoreTaskUseCase,
    DuplicateTaskUseCase,
    MoveTaskUseCase,
    ReopenTaskUseCase,
    CompleteTaskUseCase,
    CancelTaskUseCase,
    ToggleTaskFavoriteUseCase,
    CreateTaskFromTemplateUseCase,
    GetTaskConfigUseCase,
    TaskDashboardUseCase,
    AddChecklistItemUseCase,
    UpdateChecklistItemUseCase,
    RemoveChecklistItemUseCase,
    AddDependencyUseCase,
    RemoveDependencyUseCase,
    AddTaskLinkUseCase,
    RemoveTaskLinkUseCase,
    AddResponsavelAuxiliarUseCase,
    RemoveResponsavelAuxiliarUseCase,
    ListTaskCommentsUseCase,
    CreateTaskCommentUseCase,
  ],
  exports: [TaskValueSetsService],
})
export class TasksModule {}
