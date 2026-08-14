import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { AuthContextMiddleware } from './common/middlewares/auth-context.middleware';
import { CorrelationIdMiddleware } from './common/middlewares/correlation-id.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { MailModule } from './shared/infrastructure/mail/mail.module';
import { SecurityModule } from './shared/infrastructure/security/security.module';
import { StorageModule } from './shared/infrastructure/storage/storage.module';
import { AiInfrastructureModule } from './shared/infrastructure/ai/ai.module';
import { AuthorizationModule } from './shared/authorization/authorization.module';
import { SimulationGuard } from './shared/authorization/simulation.guard';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { IdentityModule } from './modules/identity/identity.module';
import { OfficesModule } from './modules/offices/offices.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ClientsModule } from './modules/clients/clients.module';
import { LegalCasesModule } from './modules/legal-cases/legal-cases.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SearchModule } from './modules/search/search.module';
import { AiModule } from './modules/ai/ai.module';
import { HealthModule } from './modules/health/health.module';
import { JudicialCaptureModule } from './modules/judicial-capture/judicial-capture.module';
import { PublicationsModule } from './modules/publications/publications.module';
import { JudicialMovementsModule } from './modules/judicial-movements/judicial-movements.module';
import { ExtrajudicialMovementsModule } from './modules/extrajudicial-movements/extrajudicial-movements.module';
import { LegalFoldersModule } from './modules/legal-folders/legal-folders.module';
import { RequestsModule } from './modules/requests/requests.module';

/**
 * Ordem de import reafirma docs/backend/04-dependencias.md — módulos base
 * (Identity, Offices) antes dos que dependem deles (Memberships, Clients,
 * LegalCases). `TimelineModule` antes de `ClientsModule`/`LegalCasesModule`/
 * `DocumentsModule` porque todos o importam (`TimelineRecorderService`) para
 * registrar eventos automáticos (Sprint 08/09). `StorageModule`/
 * `AiInfrastructureModule` são `@Global()` (mesmo padrão de `MailModule`),
 * disponíveis sem import explícito. `SearchModule` (Sprint 10) vem depois de
 * todos os módulos de conteúdo que indexa. `AiModule` (Sprint 11) vem por
 * último — consome Legal Cases/Documents/Clients/Timeline/Search (context
 * builders reaproveitam `case-scope.ts`/`document-scope.ts` como funções
 * puras, `UniversalSearchUseCase` via import direto do provider, nenhum
 * `Module` em si) e o `AiInfrastructureModule` global. `TasksModule`
 * (Prompt 14) vem depois de `ConfigurationModule` só por ordem lógica —
 * não há import de módulo entre os dois, Task Engine acessa Categoria/
 * Modelo/Conjuntos de Valores via `PrismaService` direto (mesmo
 * desacoplamento de `Processo.responsavelPrincipalId`). Demais módulos de
 * conteúdo (Comments completo, Notifications) ficam para a próxima
 * rodada — ver docs/backend-implementation/00-status.md.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,
    SecurityModule,
    MailModule,
    StorageModule,
    AiInfrastructureModule,
    AuthorizationModule,
    AuditModule,
    IdentityModule,
    OfficesModule,
    MembershipsModule,
    PermissionsModule,
    TimelineModule,
    ClientsModule,
    LegalCasesModule,
    LegalFoldersModule,
    DocumentsModule,
    ConfigurationModule,
    TasksModule,
    SearchModule,
    AiModule,
    JudicialCaptureModule,
    PublicationsModule,
    JudicialMovementsModule,
    ExtrajudicialMovementsModule,
    RequestsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // SimulationGuard entre os dois: precisa de req.authUser já resolvido
    // (JwtAuthGuard) e precisa rodar ANTES de PermissionGuard, que deve
    // enxergar as permissões já simuladas quando `simulation:use` está em
    // uso (Permission Engine, Prompt 12 §Simulador).
    { provide: APP_GUARD, useClass: SimulationGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, AuthContextMiddleware).forRoutes('*');
  }
}
