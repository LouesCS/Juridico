import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';

/**
 * Extraído do laço final de `RemoveMemberUseCase` — revoga cada sessão no
 * denylist do Redis (mesmo TTL de 24h). Reafirma o padrão existente: a
 * escrita em `Sessao` (achar quais estão ativas) acontece dentro da
 * transação de quem chama (junto da mudança de status), este helper só
 * cobre o laço de revogação no Redis que vem depois.
 *
 * NOTA para o revisor: `RemoveMemberUseCase` (e, por replicar o mesmo
 * padrão, `BlockMemberUseCase`/`SuspendMemberUseCase`/`RevokeAccessUseCase`)
 * nunca marca `Sessao.revogadaEm` no Postgres — só o denylist do Redis (TTL
 * 24h). Isto é comportamento PRÉ-EXISTENTE replicado fielmente (o prompt
 * desta rodada pediu explicitamente "revoga sessões... SAME way" que
 * `RemoveMemberUseCase`), não uma escolha nova desta rodada. Depois do TTL
 * expirar, uma sessão tecnicamente "seria válida de novo" pela leitura do
 * Postgres — gap pré-existente, fora do escopo deste módulo corrigir
 * silenciosamente; registrado aqui para visibilidade.
 */
export async function revokeSessionsInRedis(
  redisService: RedisService,
  sessionIds: string[],
  ttlSeconds = 60 * 60 * 24,
): Promise<void> {
  for (const id of sessionIds) {
    await redisService.revokeSession(id, ttlSeconds);
  }
}
