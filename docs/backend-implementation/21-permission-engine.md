# 21 — Permission Engine (Prompt 12)

> Este documento descreve o motor de autorização oficial do Quilombo Dev.
> **Toda autorização do sistema passa por aqui** — nenhum módulo novo pode
> implementar uma checagem de permissão própria fora do que está descrito
> abaixo. O motor **evolui** a arquitetura RBAC que já existia desde o
> Prompt 6A/5C (`Papel`/`Permissao`/`PapelPermissao`/`PermissaoUsuario`,
> `PermissionGuard`, `case-scope.ts`/`document-scope.ts`) — nada foi
> reescrito do zero.

## 21.1 Por que "evoluir" e não "recriar"

Antes desta rodada, o backend já tinha:

- RBAC relacional real (não um enum fixo) — `Papel` com FK opcional para
  `Escritorio` (perfil de sistema vs. perfil customizado por escritório),
  `Permissao` com `escopo` (`ALL|TEAM|ASSIGNED|OWN`), `PapelPermissao`
  (join), `PermissaoUsuario` (override individual `CONCEDER`/`NEGAR` com
  `expiraEm`) — a camada ABAC-lite já existia, só não estava completa.
- `PermissionGuard` (ação, HTTP 403) + scope builders por módulo
  (`case-scope.ts`, `document-scope.ts`, recurso, sempre HTTP 404 nunca
  403 — para nunca revelar a existência de algo fora de escopo).
- Busca Global e IA já reaproveitando os mesmos scope builders — nenhuma
  regra de autorização duplicada por eles.

O que faltava — e é o que esta rodada constrói:

1. Uma função de checagem de permissão única no backend (existia só no
   frontend).
2. Um serviço único que resolve a lista final de permissões de um membro
   (papel + overrides) — existia **triplicado** (login/refresh/troca de
   escritório), e só o login aplicava os overrides corretamente.
3. Segurança por campo (Field Level Security) — existia um único exemplo
   isolado (campos de custo de IA).
4. Perfis novos (FINANCEIRO, GESTOR) e o mecanismo de perfil customizado
   exposto por API (a tabela já suportava, faltava o endpoint).
5. Um Simulador real.
6. Uma tela administrativa.

## 21.2 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        shared/authorization/                     │
│  (@Global — AuthorizationModule)                                  │
│                                                                    │
│  permission-check.ts        hasPermission / hasAnyPermission /    │
│                              hasAllPermissions (função pura,       │
│                              espelha apps/web/.../has-permission)  │
│                                                                    │
│  permission-resolver.service.ts                                   │
│                              PermissionResolverService              │
│                              .resolveEffectivePermissions(         │
│                                membroId, papelId)                  │
│                              → papel (PapelPermissao) + overrides   │
│                                (PermissaoUsuario, NEGAR vence,      │
│                                expiraEm respeitado)                 │
│                              usado por: LoginUseCase,                │
│                              RefreshTokenUseCase,                    │
│                              SwitchOfficeUseCase, SimulationGuard     │
│                                                                    │
│  field-security.ts          DataClassification (enum) +             │
│                              FieldRule + redactFields() +            │
│                              hasFullFieldAccess()                    │
│                                                                    │
│  simulation.guard.ts        SimulationGuard (3º APP_GUARD global)     │
└─────────────────────────────────────────────────────────────────┘
```

**Pipeline de uma requisição autenticada:**

```
AuthContextMiddleware        estabelece req.authUser a partir do JWT
        │                    (claims.permissions já resolvidas no login)
        ▼
JwtAuthGuard                 impõe autenticação (401 se ausente/expirado)
        │
        ▼
SimulationGuard               se X-Simulate-Membro-Id presente:
        │                       exige simulation:use no ator REAL
        │                       resolve as permissões REAIS do membro
        │                       simulado (PermissionResolverService)
        │                       substitui req.authUser (membroId/roles/
        │                       permissions), preserva realUsuarioId/
        │                       realMembroId em req.authUser.simulacao
        ▼
PermissionGuard               impõe autorização de AÇÃO — hasPermission()
        │                     (403 se ausente)
        ▼
Use Case                     autorização de RECURSO (scope builders,
        │                     assertDocumentAccess/assertResumoAccess,
        │                     redactFields — 404 nunca 403)
        ▼
AuditInterceptor              se @Audit(...): registra ator REAL (nunca o
                              simulado), + simulacao nos metadados
```

## 21.3 RBAC — Perfis e Permissões

**Perfis de sistema** (`prisma/seed.ts`, `PAPEIS_SISTEMA`) — 8, todos com
`ehSistema: true`, `escritorioId: null` (compartilhados por todo tenant):

| Papel | Nível | Observação |
|---|---|---|
| OWNER | 100 | todas as permissões do catálogo |
| ADMIN | 90 | tudo, exceto `office:delete`/`case:read:confidential`/`ai:summarize` e as 6 chaves em `ADMIN_SOCIO_RESTRITAS` (ver §21.5) |
| SOCIO | 80 | tudo, exceto gestão de membros/escritório e `ADMIN_SOCIO_RESTRITAS` |
| **GESTOR** (novo) | 70 | gestão operacional — clientes, processos, indicadores, auditoria |
| ADVOGADO | 60 | fluxo de trabalho jurídico completo |
| **FINANCEIRO** (novo) | 50 | leitura de clientes/processos + as 3 chaves `financeiro:*` |
| ASSISTENTE | 40 | apoio administrativo |
| ESTAGIARIO | 20 | leitura restrita ao que está atribuído |

**Perfis customizados** ("COLABORADOR PERSONALIZADO") — não é um 9º papel
fixo, é o **mecanismo**: `Papel.escritorioId` já era uma FK opcional para
`Escritorio` desde o Prompt 6A; um perfil customizado é só uma linha com
`ehSistema: false` e `escritorioId` preenchido. `modules/permissions/`
expõe isso via API (§21.6).

**Cada permissão** (`Permissao`) tem `chave` (`recurso:acao[:escopo]`),
`recurso`, `acao`, `escopo` (`ALL|TEAM|ASSIGNED|OWN`), `categoria`,
`descricao` — exatamente os 4 atributos pedidos pelo Prompt 12
(Módulo≈recurso/categoria, Ação≈acao, Escopo≈escopo; "Sensibilidade" é
modelada à parte, ver §21.4, para não confundir "quem pode fazer a ação"
com "quais campos do resultado ele vê").

## 21.4 Field Level Security

`shared/authorization/field-security.ts`:

```ts
enum DataClassification { PUBLICO, INTERNO, CONFIDENCIAL, SIGILOSO, FINANCEIRO, ADMINISTRATIVO }

interface FieldRule {
  field: string;              // nome do campo no DTO
  classification: DataClassification;
  requiredPermission: string; // quem não tem, o campo some (vira null)
}

redactFields(record, rules, permissions) // aplica as regras, retorna uma cópia
```

`DataClassification` é um conceito de **aplicação** (enum TypeScript), não
uma coluna de banco — nenhuma tela hoje precisa consultar "qual a
classificação desta linha" dinamicamente, então persistir isso seria
especulativo. Cada `FieldRule` já amarra estaticamente campo →
classificação → permissão.

**Aplicação real (Cliente) — histórico e reversão:** o Prompt 12
introduziu `modules/clients/application/client-field-security.ts`
(`CLIENT_SENSITIVE_FIELD_RULES`: CPF, CNPJ, os 6 campos de endereço, e
depois nomeMae/nomePai/dataNascimento no Sprint "Clientes e Contatos"),
todos atrás da permissão `client:read:sensitive`, aplicados em
`GetClientUseCase`, `ListClientsUseCase`/`ExportClientsUseCase` (campo
`documento`) e `ClientSearchAdapter` (que além disso mascarava
parcialmente — `123.***.***-00` — em vez de simplesmente ocultar).

A Sprint **"Remover mascaramento de dados do cliente em Processos"**
reverteu essa regra: CPF/CNPJ/RG (não existe no schema)/endereço/nome da
mãe/nome do pai/data de nascimento são dados cadastrais de negócio
necessários ao trabalho jurídico — não pertencem à mesma categoria de
"dado genuinamente restrito" que `ADMIN_SOCIO_RESTRITAS` protege
(financeiro/honorários/salários, §21.5). Exigir uma permissão adicional
só para ver o CPF de um cliente que o usuário já pode abrir (`client:read`)
não protegia nada de verdade — a proteção correta já é por acesso ao
recurso (permissão + `escritorioId` em todo `where`), como o restante do
cadastro sempre foi.

Mudança concreta: `client-field-security.ts` foi **removido**;
`GetClientUseCase`/`ListClientsUseCase`/`ExportClientsUseCase` não chamam
mais `redactFields`; `ClientSearchAdapter` perdeu `maskCpf`/`maskCnpj` e
devolve o documento por completo. O motor genérico
(`shared/authorization/field-security.ts` — `redactFields`/`FieldRule`)
**continua existindo**, sem consumidor ativo hoje, pronto para um caso
genuinamente restrito no futuro (ex.: um campo financeiro dentro do
próprio Cliente, se um dia existir). A permissão `client:read:sensitive`
continua cadastrada no catálogo (não removida — dado do Permission Engine,
não mecanismo) mas não gate mais nenhum campo.

`ClientContextBuilder` (IA, "Histórico Inteligente") foi reauditado nesta
rodada: **nunca** dependeu de `client:read:sensitive` para começar — o
contexto enviado ao provedor de IA nunca incluiu CPF/CNPJ/endereço/
contatos, só Nome/Tipo/Status/datas/processos/documentos, por escolha
deliberada de minimizar dados enviados a um terceiro, ortogonal à regra de
mascaramento que existia nos DTOs. Não alterado.

O frontend não precisou de nenhuma mudança de componente — os campos já
eram exibidos como `value ?? '—'`; agora chegam sempre preenchidos (quando
o cliente os tem) em vez de eventualmente `null` por falta de permissão.

## 21.5 "Quem decide o que o ADMIN vê" — `ADMIN_SOCIO_RESTRITAS`

O Prompt 12 pede explicitamente: *"O OWNER poderá decidir se o ADMIN
poderá visualizar Financeiro/Honorários/Salários/Custos IA/Logs/
Auditoria/..."*. Isso virou uma constante no seed
(`ADMIN_SOCIO_RESTRITAS = ['role:manage', 'simulation:use', 'audit:read',
'financeiro:read', 'financeiro:honorarios:read',
'financeiro:salarios:read']`) — removida do conjunto padrão de ADMIN/SOCIO;
o OWNER concede caso a caso via `PermissaoUsuario` (efeito `CONCEDER`),
usando a tela administrativa (§21.7), nunca editando o seed.

## 21.6 Catálogo: permissões pré-cadastradas sem módulo ainda

O Prompt 12 pede o catálogo de **Módulos**/**Ações** completo, mas proíbe
implementar os módulos de negócio nesta rodada (Financeiro, Contratos,
Serviços, ...). Resolvido cadastrando as chaves reais no catálogo
(`financeiro:read`, `financeiro:honorarios:read`,
`financeiro:salarios:read`) **sem nenhum ponto de aplicação ainda** —
documentado explicitamente no seed como "catálogo, sem módulo ainda". Isso
cumpre o pedido ("nenhum módulo poderá criar permissões próprias fora do
motor") sem fabricar uma tela ou dado que não existe.

## 21.7 Tela Administrativa e API de Perfis

`modules/permissions/` (novo) — `GET /permissions` (catálogo),
`GET /roles/:id` (papel + suas chaves), `POST /roles` (criar customizado),
`PATCH /roles/:id` (renomear customizado), `PATCH /roles/:id/permissions`
(substituir o conjunto de permissões de um customizado),
`DELETE /roles/:id` (excluir customizado sem membros atribuídos —
`ROLE_IN_USE` 409 caso contrário). `GET /roles` (listagem simples) **não
foi duplicada** — já existia em `MembershipsModule`.

Todas gated por `role:manage` (permissão nova). Duas regras de segurança
aplicadas em Create/`UpdateRolePermissions`:

- **Teto de privilégio** (`assertNoEscalation`): quem tem `role:manage`
  só pode conceder, a um perfil, uma permissão que ele mesmo possui — sem
  isso, um ADMIN com `role:manage` concedido pelo OWNER (mas sem
  `case:read:confidential`) poderia criar um perfil com essa permissão e
  atribuí-lo a alguém, escalando indiretamente.
- **Nível sempre abaixo de quem cria**: um perfil customizado nasce em
  `nivel = nivel_do_criador - 1` (nunca configurável pelo cliente da API)
  — nunca no mesmo nível ou acima de quem o criou.

Frontend: `/configuracoes` (rota já existia como stub desde o Prompt 11,
substituída pela tela real) — abas "Perfis e Permissões" (`role:manage`),
"IA" (sempre visível a quem chega em `/configuracoes`), "Simulador"
(`simulation:use`). Matriz de permissões (`PermissionMatrix`) desabilita
(nunca esconde) uma chave que quem está editando não possui — mesmo "teto
de privilégio" do backend, visível antes de tentar salvar.

## 21.8 Simulador

*"OWNER navega exatamente como aquele usuário, sem logout, sem troca de
sessão."* Implementado como um mecanismo **por requisição**, não uma
segunda sessão:

1. Frontend: `useSimulationStore` (Zustand, sem `persist` — sobreviver a
   um F5 sem intenção clara seria perigoso) guarda o `membroId` alvo;
   `lib/api/client.ts` anexa o header `X-Simulate-Membro-Id` em toda
   requisição enquanto ativo.
2. Backend: `SimulationGuard` — só aceita o header se o ator REAL (sempre
   lido do JWT da requisição atual, nunca de um estado simulado anterior —
   impossível encadear simulação) tem `simulation:use`; resolve o membro
   alvo (mesmo escritório, `ATIVO`) e suas permissões REAIS via
   `PermissionResolverService` — a mesma função usada no login. **A
   simulação nunca eleva**: ela troca a identidade efetiva para a de
   outro membro real, então o resultado é estritamente as permissões
   daquele membro, nunca uma união com as do OWNER.
3. Auditoria: toda ação auditada durante uma simulação registra o **ator
   real** (nunca o simulado) em `atorId`, mais `metadados.simulacao`
   (`{realMembroId, membroSimuladoId}`) — rastreável sem ambiguidade.

Isso não é um efeito visual — os dados que voltam de cada endpoint durante
a simulação são exatamente os que o membro simulado veria (scope builders,
field security e tudo mais respeitam a identidade simulada).

## 21.9 IA — pipeline de segurança

```
Pergunta do usuário
        │
        ▼
Controller (@RequirePermission('ai:summarize' | rota do chat))
        │  PermissionGuard já barrou quem não tem a ação
        ▼
Use Case (RequestSummaryUseCase / AiChatUseCase)
        │
        ▼
Context Builder (Case/Document/Client)
        │  reaproveita case-scope.ts/document-scope.ts/assertDocumentAccess
        │  — a query que busca os dados JÁ é filtrada por escopo e
        │  confidencialidade; nunca busca tudo e filtra depois
        │  (auditado nesta rodada — client-context-builder.ts nunca
        │  incluiu campo sigiloso, ver §21.4)
        ▼
PromptBuilder + PromptSanitizer (Sprint 11 — neutraliza tentativas de
        │  prompt injection, delimita o contexto)
        ▼
AiProviderRegistry → Provider (nunca chamado direto por uma tela)
```

Se o solicitante não tem acesso ao processo/documento/cliente-alvo, o
Context Builder retorna `NOT_FOUND` **antes** de montar qualquer prompt —
o provedor de IA nunca é chamado. Para o escopo `GLOBAL` do chat, a fonte é
a própria Busca Global (`UniversalSearchUseCase`), já filtrada por
adapter — uma entidade fora de escopo simplesmente não aparece nos
resultados que viram contexto, o mesmo princípio de "nunca confirmar,
nunca inferir" pedido pelo Prompt 12 (uma pergunta como "quanto ganha
Fulano" nunca encontra dado de honorário/salário no contexto — esses
campos não existem em nenhum módulo implementado — então o modelo
determinístico (`MockAiProvider`) não tem `Campo: valor` correspondente
para extrair e responde de forma genérica, nunca inventando ou
confirmando um valor).

## 21.10 Auditoria

`LogAuditoria.resultado` já tinha o enum `SUCESSO|FALHA|NEGADO`. Nesta
rodada, `AuditInterceptor` passou a: (a) sempre atribuir `atorId` ao
usuário REAL mesmo durante simulação; (b) incluir `metadados.simulacao`
quando aplicável. Pendência já conhecida, não fechada nesta rodada
(documentada para não fingir que foi): negativas de **recurso** (404 por
escopo/confidencialidade) continuam indistinguíveis de "não existe" na
auditoria — resolver isso exigiria tocar dezenas de use cases para anexar
`meta.motivo`, fora do escopo incremental desta rodada.

## 21.11 Exemplos de uso

**Negar acesso a recurso (Cliente) — a proteção real é aqui, não por campo:**
```
GET /clients/cli-1          (sem client:read)
→ 403 FORBIDDEN                      (Permission Engine barra o endpoint inteiro)

GET /clients/cli-1          (com client:read)
→ 200 { ..., cpf: "52998224725", enderecoCep: "01310-000", ... }   (cadastro completo —
   ver §21.4: campos de negócio do cliente não exigem permissão extra desde a Sprint
   "Remover mascaramento de dados do cliente em Processos")
```

**Criar perfil customizado sem exceder o que o ator tem:**
```
POST /roles  { nome: "Recepção", permissoes: ["client:read", "case:read:confidential"] }
→ 403 FORBIDDEN se o ator (mesmo com role:manage) não tem case:read:confidential
```

**Simular um Estagiário sendo OWNER:**
```
Header: X-Simulate-Membro-Id: membro-estagiario
GET /legal-cases            → só os processos ASSIGNED daquele estagiário,
                               mesmo o ator real sendo OWNER com case:read:all
```

## 21.12 Boas práticas para os próximos módulos

1. **Nunca** escrever `permissions.includes('...')` inline — importar
   `hasPermission`/`hasAnyPermission` de `shared/authorization/permission-check.ts`.
2. Resolver a permissão final de um membro (login, refresh, um job, o que
   for) sempre via `PermissionResolverService` — nunca reimplementar a
   junção `Papel`→`PapelPermissao` + override.
3. Um campo sensível novo (ex.: Honorários, quando o módulo Financeiro
   nascer) ganha uma `FieldRule` e passa por `redactFields()` no DTO — não
   inventar um mecanismo de mascaramento paralelo.
4. Autorização de ação → `PermissionGuard`/`@RequirePermission` (403).
   Autorização de recurso → filtro na query + 404 (nunca 403). Nunca
   inverter os dois.
5. Todo novo endpoint mutante relevante ganha `@Audit(...)` — a auditoria
   já registra o ator real automaticamente, mesmo sob simulação.

---

**Anterior:** [20-context-next-step.md](20-context-next-step.md) · **Início:** [00-status.md](00-status.md)
