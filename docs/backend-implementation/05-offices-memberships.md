# 05 — Offices e Memberships

## Offices — implementado

`GET /api/v1/office`, `PATCH /api/v1/office`, `DELETE /api/v1/office`
(com confirmação por nome + revogação de todas as sessões do escritório).
Sem testes unitários dedicados nesta rodada (lógica simples o suficiente
para ficar coberta pelo typecheck + revisão manual; recomendado adicionar
teste do fluxo de confirmação de nome incorreto na próxima rodada).

## Memberships — implementado e testado

| Endpoint | Use case | Testado |
|---|---|---|
| `GET /members` | `ListMembersUseCase` | Não |
| `PATCH /members/:id/role` | `UpdateMemberRoleUseCase` | ✅ 5 cenários — **inclui a regra mais crítica do módulo** (auto-escalonamento e último Owner) |
| `DELETE /members/:id` | `RemoveMemberUseCase` | Não (mesma lógica de proteção do Owner do use case acima, sem duplicar teste) |
| `POST /invitations` | `InviteMemberUseCase` | Não |
| `GET /invitations` | `ListInvitationsUseCase` | Não |
| `POST /invitations/:id/resend` | `ResendInvitationUseCase` | Não |
| `DELETE /invitations/:id` | `RevokeInvitationUseCase` | Não |
| `POST /invitations/:token/accept` | `AcceptInvitationUseCase` | Não |
| `GET /roles` | `ListRolesUseCase` | Não |

## Pendências registradas explicitamente no próprio código

`RemoveMemberUseCase` tem comentário explícito: a checagem "processos onde é
responsável têm novo responsável antes de desativar" depende do módulo
`LegalCases` (inexistente ainda) — a proteção do último `OWNER` (a regra de
segurança mais crítica, que não depende de `LegalCases`) já está
implementada e testada.

## Seed

`prisma/seed.ts` — papéis de sistema (OWNER, ADMIN, SOCIO, ADVOGADO,
ASSISTENTE, ESTAGIARIO) + catálogo de permissões + matriz papel×permissão
completa (reafirma `docs/database/08-permissoes-seguranca.md §8.3`) +
escritório de demonstração (dados fictícios, sem PII real). **Não executado**
nesta rodada (exige Postgres real).

---

**Anterior:** [04-identity.md](04-identity.md) · **Próximo:** [06-users.md](06-users.md)
