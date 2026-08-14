import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import {
  ArchiveClientUseCase,
  DuplicateClientUseCase,
  RestoreClientUseCase,
} from './application/use-cases/client-lifecycle.use-cases';
import { ToggleClientFavoriteUseCase } from './application/use-cases/client-favorites.use-case';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { DeleteClientUseCase } from './application/use-cases/delete-client.use-case';
import { ExportClientsUseCase } from './application/use-cases/export-clients.use-case';
import { GetClientUseCase } from './application/use-cases/get-client.use-case';
import { ListClientLegalCasesUseCase } from './application/use-cases/list-client-legal-cases.use-case';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case';
import { ListClientTimelineUseCase } from './application/use-cases/list-client-timeline.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { ClientsController } from './presentation/clients.controller';

@Module({
  imports: [TimelineModule],
  controllers: [ClientsController],
  providers: [
    ListClientsUseCase,
    CreateClientUseCase,
    GetClientUseCase,
    UpdateClientUseCase,
    DeleteClientUseCase,
    ArchiveClientUseCase,
    RestoreClientUseCase,
    DuplicateClientUseCase,
    ListClientLegalCasesUseCase,
    ToggleClientFavoriteUseCase,
    ListClientTimelineUseCase,
    ExportClientsUseCase,
  ],
})
export class ClientsModule {}
