import { Global, Module } from '@nestjs/common';
import { PermissionResolverService } from './permission-resolver.service';
import { SimulationGuard } from './simulation.guard';

/**
 * Núcleo do Permission Engine (Prompt 12) — `@Global()`, mesmo padrão de
 * `AiInfrastructureModule`/`StorageModule`: disponível a qualquer módulo
 * sem import explícito. `PermissionResolverService` é consumido por
 * Identity (login/refresh/switch-office) e por `SimulationGuard`;
 * `hasPermission`/`hasAnyPermission`/`redactFields` (`permission-check.ts`/
 * `field-security.ts`) são funções puras, importadas diretamente onde
 * necessário, sem precisar de DI.
 */
@Global()
@Module({
  providers: [PermissionResolverService, SimulationGuard],
  exports: [PermissionResolverService, SimulationGuard],
})
export class AuthorizationModule {}
