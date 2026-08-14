# 07 — Team e Memberships

## Implementado e testado

Backend real (`apps/api/src/modules/memberships/`) consumido via MSW
(mesma limitação de sempre: sem Postgres neste ambiente, nenhuma chamada
foi validada contra o backend de verdade). Código real:

```text
src/features/team/
  api/{team.api.ts, keys.ts, queries.ts, mutations.ts}
  schemas/team.schemas.ts
  components/{members-table, invite-member-dialog, invitations-table,
              accept-invitation-form, role-select, team-page}.tsx
  index.ts
src/app/(app)/admin/usuarios/page.tsx     # rota real, gated por member:read
src/app/(public)/convite/[token]/page.tsx  # aceite de convite (público)
src/mocks/handlers/team.ts
```

**Endpoints reais usados** (todos existentes em
`apps/api/src/modules/memberships/presentation/memberships.controller.ts`):
`GET /members`, `PATCH /members/:id/role`, `DELETE /members/:id`,
`POST /invitations`, `GET /invitations`, `POST /invitations/:id/resend`,
`DELETE /invitations/:id`, `POST /invitations/:token/accept`, `GET /roles`.

## Funcionalidades implementadas

- Listagem de membros com busca (nome/e-mail) e filtro por status —
  client-side, porque `GET /members` não pagina nem filtra
  server-side (retorna a lista completa do escritório).
- Alteração de papel inline (`Select`), remoção (desativação soft) com
  `ConfirmDialog`, convite de novo membro (`Dialog` + formulário RHF/Zod),
  reenvio e revogação de convite pendente.
- **Proteção do último Owner ativo** — client-side (desabilita o
  controle com `Tooltip` explicando o motivo) **e** backend real
  (`LAST_OWNER` 409, `UpdateMemberRoleUseCase`/`RemoveMemberUseCase`) —
  a UI nunca é a única barreira, reafirma docs/frontend/06-autorizacao.md
  §6.1.
- **Auto-escalonamento bloqueado** — usuário não pode alterar o próprio
  papel (`SELF_ESCALATION_FORBIDDEN` 403 real), client-side desabilita o
  próprio seletor com tooltip.
- Aceite de convite (`/convite/[token]`, rota pública): mesmo texto
  neutro para token inválido e expirado (ambos retornam `NOT_FOUND` no
  use case real — o backend não distingue os dois casos, reafirma
  docs/frontend/06-autorizacao.md §6.4); aceite duplicado é idempotente
  (o use case real não falha na segunda tentativa).
- Toda query key escopada por `officeId`
  (`['office', officeId, 'team', ...]`); mutations invalidam só o recurso
  afetado (`members`/`invitations`), nunca `queryClient.clear()`.
- Permissões reais (`member:read`/`member:invite`/`member:update-role`/
  `member:remove`) — sem nenhuma delas, o item de navegação "Equipe"
  nem aparece (`config/navigation.ts`).

## Não implementado / fora do contrato real

- **Reativação de membro desativado** — não existe endpoint no backend
  (`memberships.controller.ts` não tem rota de reativação); não foi
  construído nenhum botão "reativar" para não simular uma ação sem
  suporte real. Registrado como pendência de backend.
- **Papel próprio do escritório (`Papel` customizado)** — `GET /roles`
  retorna papéis de sistema + do escritório; a tela de edição de papéis
  (`/admin/perfis`) continua fora de escopo desta rodada.

## Testes reais

10 testes novos (`members-table.spec.tsx`, `invite-member-dialog.spec.tsx`,
`accept-invitation-form.spec.tsx`): listagem, alteração de papel bem
sucedida, proteção visual do último Owner, proteção funcional do último
Owner (409 via hook direto), controles ausentes sem permissão, convite
válido, erro 422 mapeado para o campo, convite inválido/expirado (mesma
mensagem neutra), convite já aceito (idempotente).

---

**Anterior:** [06-shell-navigation.md](06-shell-navigation.md) · **Próximo:** [08-dashboard.md](08-dashboard.md)
