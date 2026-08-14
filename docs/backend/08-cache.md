# 08 — Cache (Redis)

> Reafirma [../05-arquitetura-backend.md](../05-arquitetura-backend.md) e
> [../api/20-performance.md §20.2](../api/20-performance.md).

## 8.1 Chaves — sempre prefixadas por tenant

```
tenant:{escritorioId}:dashboard:summary
tenant:{escritorioId}:dashboard:deadlines
tenant:{escritorioId}:ai-usage:{mesReferencia}
system:roles-catalog
system:permissions-catalog
session:denylist:{sessionId}
```
Reafirma [../database/01-estrategia-multitenancy.md §1.4](../database/01-estrategia-multitenancy.md) —
cache é vetor de vazamento tão real quanto o banco; nenhuma chave de cache de
dado de tenant existe sem o prefixo `tenant:{id}:`.

## 8.2 Estratégia por tipo de dado

| Dado | TTL | Invalidação |
|---|---|---|
| Agregados de Dashboard | 60s | Por evento (`ProcessoCriado`, `PrazoCriado`, etc. invalidam a chave do tenant) — TTL é rede de segurança, não mecanismo primário |
| `GET /v1/office/ai-usage` | 5 min | Por evento (`ResumoIaConcluido`) ou expiração |
| Catálogo de papéis/permissões de sistema | 1h | Raramente muda; invalidação manual em deploy que altera o catálogo |
| Denylist de sessão | TTL = TTL do access token (15 min) | Nunca invalidado antes — é a própria natureza do dado (expira com o token que protege) |
| Resultado de busca | **Sem cache** | Busca reflete estado atual; cache aqui arrisca resultado desatualizado com implicação de permissão (reafirma [../api/20-performance.md §20.2](../api/20-performance.md)) |

## 8.3 Padrão de invalidação por evento (preferido sobre TTL curto)

```
ProcessoCriado / ProcessoAtualizado / PrazoCriado / PrazoConcluido
        │
        ▼
CacheInvalidationListener (shared/infrastructure/cache/)
        │
        ▼
redis.del(`tenant:${escritorioId}:dashboard:*`)
```
TTL curto é a rede de segurança para o caso de um evento não cobrir 100% dos
efeitos colaterais possíveis — a fonte primária de correção é sempre a
invalidação orientada a evento, nunca "esperar o TTL passar".

## 8.4 Redis também serve BullMQ

Mesma instância Redis (bancos lógicos separados por `db` index ou prefixo de
chave) serve cache de aplicação e broker do BullMQ (reafirma
[../05-arquitetura-backend.md §5.8](../05-arquitetura-backend.md)) — uma
infraestrutura, dois usos, sem cruzamento de chave entre eles.

---

**Anterior:** [07-storage.md](07-storage.md) · **Próximo:** [09-filas.md](09-filas.md)
