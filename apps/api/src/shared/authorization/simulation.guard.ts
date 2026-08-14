import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { DomainError } from '../domain/result';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { hasPermission } from './permission-check';
import { PermissionResolverService } from './permission-resolver.service';

const SIMULATION_HEADER = 'x-simulate-membro-id';

/**
 * "Simulador" (Prompt 12 §Simulador) — OWNER navega exatamente como outro
 * membro, sem logout, sem trocar de sessão. Registrado como 3º guard global
 * em `app.module.ts`, entre `JwtAuthGuard` (garante `req.authUser` real) e
 * `PermissionGuard` (precisa ver as permissões já simuladas). Nunca é
 * chamado dentro do middleware: `AuthContextMiddleware` só *estabelece*
 * contexto a partir do JWT (comentário do próprio arquivo); guards
 * *impõem* decisões — este segue a mesma separação, e por rodar como
 * `CanActivate` (não um Express middleware cru), qualquer `DomainError`
 * lançado aqui já passa pelo filtro de exceção global normalmente (mesmo
 * caminho comprovado de `PermissionGuard`).
 *
 * Sempre lê `req.authUser.permissions` do usuário REAL (recém-montado pelo
 * JWT a cada requisição) para checar `simulation:use` — a simulação nunca
 * pode ser usada para autorizar uma nova simulação (sem persistência entre
 * requisições, sem risco de escalonamento em cadeia).
 *
 * `TenantContextStorage` não é alterado aqui de propósito: só
 * `escritorioId` é lido de lá (extension de tenant-scoping), e simulação é
 * sempre dentro do mesmo escritório — nada a propagar.
 */
@Injectable()
export class SimulationGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.authUser) return true; // JwtAuthGuard decide autenticação; nada a fazer aqui.

    const alvoMembroId = req.header(SIMULATION_HEADER);
    if (!alvoMembroId) return true; // Caminho normal (sem simulação) — zero mudança de comportamento.

    if (!hasPermission(req.authUser.permissions, 'simulation:use')) {
      throw new DomainError('FORBIDDEN', 'Você não tem permissão para simular outro usuário.');
    }

    const alvo = await this.prisma.client.membro.findFirst({
      where: { id: alvoMembroId, escritorioId: req.authUser.escritorioId, status: 'ATIVO' },
      include: { papel: true },
    });
    if (!alvo) {
      throw new DomainError('NOT_FOUND', 'Membro para simulação não encontrado.');
    }

    const permissoesSimuladas = await this.permissionResolver.resolveEffectivePermissions(
      alvo.id,
      alvo.papelId,
    );

    req.authUser = {
      ...req.authUser,
      membroId: alvo.id,
      roles: [alvo.papel.nome],
      permissions: permissoesSimuladas,
      simulacao: {
        realUsuarioId: req.authUser.usuarioId,
        realMembroId: req.authUser.membroId,
      },
    };

    return true;
  }
}
