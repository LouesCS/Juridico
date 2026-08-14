import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuditService } from '../application/audit.service';

const contextQuerySchema = z.object({
  resourceType: z.enum([
    'PASTA_JURIDICA',
    'PROCESSO',
    'MOVIMENTACAO_JUDICIAL',
    'MOVIMENTACAO_EXTRAJUDICIAL',
    'PEDIDO',
  ]),
  resourceId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  period: z.enum(['RECENTES', 'ANTIGAS']).default('RECENTES'),
});

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('context')
  context(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.audit.listContext(user, contextQuerySchema.parse(query));
  }
}
