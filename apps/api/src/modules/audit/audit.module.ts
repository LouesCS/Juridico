import { Module } from '@nestjs/common';
import { AuditService } from './application/audit.service';
import { AuditController } from './presentation/audit.controller';
import { LegalFoldersModule } from '../legal-folders/legal-folders.module';

/**
 * `PrismaService` vem de `DatabaseModule` (Global), não precisa ser
 * reimportado aqui. `AuditInterceptor` é registrado globalmente em
 * `AppModule` via APP_INTERCEPTOR, não neste módulo (precisa do
 * `AuditService` já resolvido pelo DI container raiz).
 */
@Module({
  imports: [LegalFoldersModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
