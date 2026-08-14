# Módulo Colaboradores

Documentação da Sprint "Colaboradores": gestão das pessoas do escritório e do
acesso que elas têm ao sistema — cargos, grupos, permissões, bloqueio/
suspensão, convites e sessões. Complementa (não substitui)
`docs/backend-implementation/21-permission-engine.md` e
`docs/backend-implementation/22-configuration-engine.md`.

## Decisão de arquitetura

**Não existe uma entidade "Colaborador" no banco.** "Colaborador" é o nome de
produto para `Membro` (join `Usuario` × `Escritorio`), agora evoluído com
campos de perfil próprios e a capacidade de existir sem conta de acesso.

### Diferença entre Usuário, Membro/Colaborador, Papel, Cargo e Grupo

| Entidade | O que é | Escopo |
|---|---|---|
| `Usuario` | Identidade de login (e-mail, senha, MFA, sessões) | Global — a mesma pessoa pode ter um `Usuario` e vários `Membro` em escritórios diferentes |
| `Membro` (produto: **Colaborador**) | A pessoa dentro de UM escritório: dados pessoais, contato, endereço, dados profissionais, OAB — com ou sem `Usuario` vinculado | Por escritório |
| `Papel` | Função de permissão (OWNER, ADMIN, ADVOGADO, perfis customizados) | Sistema ou por escritório |
| `Cargo` | Título de trabalho (Advogado, Estagiário, Analista...) — catálogo configurável, sem relação com permissões | Por escritório (Configuration Engine) |
| `GrupoColaboradores` | Agrupamento organizacional (Financeiro, Comercial, Sócios...) — sem relação com permissões | Por escritório (Configuration Engine, já existia antes desta sprint) |

Um colaborador pode ter um `Papel` (se tiver acesso), um `Cargo` e vários
`GrupoColaboradores` simultaneamente — os três nunca se sobrepõem.

### `Membro.usuarioId` agora é opcional

Antes desta sprint, `Membro.usuarioId` era obrigatório — não era possível
cadastrar uma pessoa sem criar, no mesmo instante, uma conta de login. Isso
colidia com o requisito "cadastrar apenas como colaborador, sem criar acesso
ativo". A partir desta sprint:

- `Membro.usuarioId` é **nullable**.
- `Membro` ganhou campos próprios de identidade (`nome`, `email` — obrigatórios
  — e todos os campos pessoais/contato/endereço/profissionais) para que um
  colaborador sem conta ainda tenha nome, e-mail etc. exibíveis. Antes desta
  sprint, essa informação só existia via `Usuario.nome`/`Usuario.email`.
- Quando o acesso é concedido (convite aceito), o `Usuario` criado/vinculado
  recebe `nome`/`email` copiados de `Membro` — todo código que já lia
  `usuario.nome` continua funcionando sem alteração para quem tem acesso.
- Migração de dados: para `Membro`s já existentes, backfill
  `membro.nome = usuario.nome`, `membro.email = usuario.email`.

### "Situação de acesso" é derivada, não é um novo enum

Reaproveita integralmente `StatusMembro` e `StatusUsuario` já existentes —
calculada em runtime por `computeSituacaoAcesso`
(`apps/api/src/modules/memberships/application/use-cases/collaborator-status.util.ts`),
usada tanto no detalhe quanto na listagem para nunca haver duas
implementações divergentes da mesma regra:

```
Membro.status === 'INATIVO'          → Inativo       (prioridade máxima)
Membro.status === 'SUSPENSO'         → Suspenso
Membro.usuarioId === null:
  há Convite PENDENTE para este Membro → Convite pendente
  senão                                 → Sem acesso
Membro.usuarioId presente:
  Usuario.status === 'BLOQUEADO'      → Bloqueado
  senão                               → Desbloqueado
```

`INATIVO`/`SUSPENSO` (estado do próprio `Membro`) sempre vencem sobre o
estado da conta de acesso (`Usuario`) — um colaborador inativo ou suspenso é
assim independentemente de ter ou não login.

A listagem ("Todos" = sem filtro de situação) **inclui** colaboradores
inativos — "remover colaborador" é soft-delete (`Membro.status = 'INATIVO'`),
nunca some do catálogo, apenas passa a exibir o badge "Inativo".

### Convite vinculado a um Membro pré-existente

`Convite` ganhou `membroId` (nullable). Quando se concede acesso a um
colaborador já cadastrado sem conta ("Permitir acesso"), o convite referencia
esse `Membro`; `AcceptInvitationUseCase` passa a **atualizar** o `Membro`
existente (define `usuarioId`) em vez de criar um novo, preservando todo o
histórico/dados de perfil já cadastrados. O fluxo tradicional de convite
direto (sem colaborador pré-existente) continua idêntico ao de antes desta
sprint.

## Backend — status

Tudo dentro do módulo `memberships` já existente (evoluído, não duplicado) +
um novo catálogo `Cargo` dentro do módulo `configuration` já existente.

### Endpoints novos (`apps/api/src/modules/memberships/presentation/memberships.controller.ts`)

| Endpoint | Permissão | Caso de uso |
|---|---|---|
| `GET /members` (com querystring) | `member:read` | `ListCollaboratorsUseCase` — paginado por cursor, com todos os filtros/ordenações do módulo. Sem querystring, continua retornando o array plano de sempre (`ListMembersUseCase`) — retrocompatível para quem já consome `/members` (seletor de Responsável em Clientes, Grupos de Colaboradores) |
| `GET /members/:id` | `member:read` | `GetCollaboratorUseCase` |
| `POST /members` | `member:create` | `CreateCollaboratorUseCase` |
| `PATCH /members/:id` | `member:update` | `UpdateCollaboratorUseCase` |
| `POST /members/:id/block` \| `/unblock` | `member:block` | `BlockMemberUseCase`/`UnblockMemberUseCase` (`Usuario.status`) |
| `POST /members/:id/suspend` \| `/unsuspend` | `member:block` | `SuspendMemberUseCase`/`UnsuspendMemberUseCase` (`Membro.status`) |
| `POST /members/:id/grant-access` | `member:manage-access` | `GrantAccessUseCase` (reaproveita `InviteMemberUseCase`) |
| `POST /members/:id/revoke-access` | `member:manage-access` | `RevokeAccessUseCase` (nunca zera `usuarioId`) |
| `DELETE /members/:id/sessions` | `member:manage-access` | `RevokeAllSessionsUseCase` (escopado ao escritório atual) |

`DELETE /members/:id` (remover/inativar) e `PATCH /members/:id/role`
(alterar papel) já existiam e continuam como antes.

### Permissões novas (catálogo em `prisma/seed.ts`)

`member:create`, `member:update`, `member:block` (cobre bloquear/
desbloquear/suspender/reativar), `member:manage-access` (conceder/remover
acesso + revogar sessões), `member:export`, `member:view-administrative-data`
(reservada — CPF/RG/OAB/anotações; ADMIN/SOCIO não a recebem por padrão,
OWNER concede caso a caso, mesmo padrão de `financeiro:*`).

Reaproveitadas sem criar chave nova: `member:remove` (= "excluir/inativar"
do prompt), `role:manage` (= "gerenciar permissões" do prompt),
`member:invite` (envio/reenvio de convite).

### Regras de segurança

- **Teto de privilégio**: reaproveita `assertNoEscalation` já existente em
  `role-lifecycle.use-cases.ts` — "Configurar permissões" de um colaborador
  continua sendo editar o `Papel`, mesmo motor, sem segundo sistema.
- **Último OWNER protegido**: extraído para
  `apps/api/src/modules/memberships/application/guards/last-owner.guard.ts`
  (`assertNotLastActiveOwner`), aplicado em remover, alterar papel, bloquear
  e remover acesso — nenhuma dessas ações pode deixar o escritório sem OWNER
  ativo.
- **Revogação de sessão ao bloquear/suspender/remover acesso**: reaproveita
  `RedisService.revokeSession` (mesmo padrão de `RemoveMemberUseCase`).

### Catálogo de Cargos (`apps/api/src/modules/configuration/`)

Clone estrutural de `GrupoColaboradores`/`collaborator-groups.*`: modelo
`Cargo` (nome, descrição, ordem, ativo, soft-delete, único por escritório),
`cargos.use-cases.ts` + `cargos.controller.ts` (`configuration/cargos`),
gated por `configuration:read`/`configuration:manage`. `Membro.cargo`
(string livre) fica **deprecado**, mantido só para leitura de dados
antigos — `Membro.cargoId` (FK) é o campo ativo.

### Timeline

`EscopoEventoTimeline` ganhou `COLABORADOR`; `EventoTimeline.membroId`
(nullable); `TipoEventoTimeline` ganhou os eventos do módulo
(`COLABORADOR_CADASTRADO`, `ACESSO_CONCEDIDO`, `COLABORADOR_BLOQUEADO`,
`PAPEL_ALTERADO`, `SESSOES_REVOGADAS` etc. — lista completa no schema).
Auditoria: `@Audit` decorator em todo endpoint mutante, zero código manual.

## Frontend — status

Evoluído dentro de `features/team` (nome interno da pasta mantido por
compatibilidade técnica — só o texto visível virou "Colaboradores").

- **Rotas**: `/colaboradores` (lista) e `/colaboradores/[id]` (detalhe,
  página cheia). `/admin/usuarios` virou um redirect client-side para
  `/colaboradores` (nunca 404, mantém link/bookmark antigo funcionando).
  `config/navigation.ts`: item "Colaboradores" (já existia em "PESSOAS")
  atualizado para o novo `href`.
- **Lista/filtros** (`collaborators-page.tsx`): mesmo padrão de
  `clients-page.tsx` — nuqs para filtros rápidos + `Sheet` de filtros
  avançados (nome/CPF/e-mail/telefone/nascimento dia-mês-ano e período/
  cadastro/última alteração), 10 ordenações, exportação CSV client-side
  (sem endpoint de export dedicado nesta sprint), paginação com "Carregar
  mais" (acumula localmente — divergência deliberada do padrão só-mensagem
  de Clientes).
- **`collaborator-form-dialog.tsx`**: mesmo esqueleto validado do sprint
  anterior (`DialogContent`/`DialogHeader`/`DialogBody`/`DialogFooter`,
  header fixo/corpo rolável/footer fixo), mesmo schema Zod para criar/
  editar. Checkbox "Permitir acesso ao sistema" só aparece no cadastro;
  na edição, acesso é gerenciado pelas ações dedicadas (bloquear/suspender/
  conceder-remover acesso).
- **`collaborator-detail-page.tsx`**: mesmo layout de `client-detail-page.tsx`
  (grade principal + coluna lateral com `QuickActionsCard`/`RelatedPanel`),
  abas Resumo/Dados pessoais/Contato/Endereço/Dados profissionais/OAB/
  Acesso ao sistema/Permissões/Grupos/Sessões + placeholders para módulos
  ainda não implementados (Processos/Tarefas/Serviços/Registros de
  trabalho/Auditoria).
- **"Configurar permissões"**: reaproveita o `PermissionMatrix`/editor de
  papel já existente em `features/permissions` — não há um segundo motor de
  permissão na tela de Colaboradores.
- **Cargos** (`/configuracoes/cargos`): clone do padrão flat-list-mais-dialog
  de `task-categories-page.tsx`, atrás de `ConfigurationRouteGuard`.
- **MSW**: ambos os conjuntos de mocks atualizados —
  `mocks/demo/handlers.ts` (modo demo no navegador, dados cobrindo todas as
  situações de acesso) e `mocks/handlers/*.ts` (Vitest).

## Pendências conhecidas

- Não há endpoint de exportação server-side de colaboradores — o botão
  "Exportar" gera um CSV client-side sobre a página atual carregada.
- Não há tela de listagem de sessões por colaborador (só a ação "Revogar
  sessões" avulsa) — a aba "Sessões" do detalhe mostra um resumo, não uma
  lista completa.
- `member:export`/`member:view-administrative-data` estão semeadas no
  catálogo mas sem regra de negócio adicional além do gate de permissão
  (mesmo padrão "catálogo-apenas" já usado para `financeiro:*`).
- Dados de folha de pagamento/salário/banco de horas/ponto eletrônico:
  **fora de escopo**, não implementados nem modelados (conforme instrução
  explícita da sprint).
