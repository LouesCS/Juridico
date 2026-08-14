# 19 — Decisões, Conflitos e Riscos desta Etapa

## 19.1 Conflito: formato de erro do Prompt 5B vs. RFC 9457 já oficial

**Conflito.** O Prompt 5B §37 pede uma estrutura de erro
`{code, message, details, fieldErrors, correlationId, timestamp, path}`. A
especificação de API já oficial (`docs/api/17-errors.md`) define RFC 9457
Problem Details: `{type, title, status, detail, instance, code,
correlationId, fieldErrors, meta}`.

**Impacto.** Os nomes de campo divergem (`message`↔`detail`,
`details`↔`meta`, `path`↔`instance`) e o formato RFC 9457 tem campos
adicionais (`type`, `title`, `status`) que o Prompt 5B não pede.

**Resolução aplicada.** RFC 9457 prevalece (já era contrato aprovado);
`timestamp` foi **adicionado** como membro de extensão (permitido pelo RFC)
para atender à exigência do Prompt 5B sem quebrar o contrato já aprovado.
Implementado em `common/filters/all-exceptions.filter.ts`, testado em
`all-exceptions.filter.spec.ts`.

## 19.2 Decisão: escopo desta etapa — 3 módulos reais, não 17 superficiais

O Prompt 5B pede a implementação completa de 17 módulos com testes
unitários, integração, E2E, Docker e CI, tudo na mesma etapa. Feito de
forma honesta (com verificação real de cada passo, como o próprio prompt
exige em §45-48), isso corresponde a semanas de trabalho de engenharia.

**Decisão:** priorizar profundidade e verificação sobre amplitude —
implementar de fato (com build, typecheck, lint e testes reais passando)
os três módulos fundacionais (`Identity`, `Offices`, `Memberships`, mais
`Health`), documentar honestamente os 13 restantes como pendência explícita
(nunca finge implementação), e deixar a base (schema completo, infra
multi-tenant completa) pronta para os módulos seguintes serem adicionados
seguindo exatamente o mesmo padrão.

## 19.3 Bootstrap exceptions na extensão tenant-scoped

**Situação:** duas operações legítimas não têm (nem podem ter)
`TenantContext` — registro do primeiro escritório (`Escritorio` ainda não
existe) e aceite de convite (usuário entrando em um tenant novo). A regra
geral "toda operação em modelo tenant-scoped exige contexto" bloquearia os
dois fluxos mais básicos do produto.

**Resolução:** `create()` é permitido sem contexto **somente quando o
chamador já forneceu `escritorioId` explicitamente** nos dados (nunca cria
linha sem tenant, apenas dispensa a sessão para esse caso específico).
Operações de leitura/atualização continuam exigindo contexto
incondicionalmente — por isso `AcceptInvitationUseCase` precisou de um
segundo mecanismo (`PrismaService.runBootstrapTransaction`/
`bootstrapClientSemFiltroDeTenant`, client sem a extensão de tenant, usado
**apenas** nestes dois fluxos, nunca em código de domínio já autenticado).

## 19.4 Padrão de leitura cross-tenant no login (`listarMembrosAtivosDoUsuario`)

**Situação:** o contrato de login (`docs/api/04-identity.md §4.3`) exige
retornar a lista de escritórios do usuário — mas a arquitetura oficial
(`docs/backend/04-dependencias.md`) proíbe `Identity` de importar
`Membership`.

**Resolução:** em vez de quebrar a regra de dependência (importar
`Memberships` dentro de `Identity`) ou criar uma camada de porta/adapter só
para isso, a leitura "em quais escritórios este usuário tem vínculo ativo"
foi implementada como um método dedicado e auditável em `PrismaService`
(`listarMembrosAtivosDoUsuario`) — é inerentemente uma consulta global
(cross-tenant por natureza, sempre filtrada pelo `usuarioId` do próprio
ator, nunca por `escritorioId` arbitrário), então vive na infraestrutura
compartilhada, não em nenhum dos dois módulos de domínio. `Identity`
continua com zero import de `Memberships`.

## 19.5 Bug real encontrado e corrigido pelos testes

`PermissionGuard` comparava escopo `ALL` (maiúsculo) mas o catálogo de
permissões seedado (`prisma/seed.ts`) e o próprio contrato de API
(`docs/api/03-autorizacao.md §3.8`) usam `all` minúsculo (`case:read:all`).
O teste `permission.guard.spec.ts` pegou isso antes de qualquer código
rodar contra dado real — corrigido em `common/guards/permission.guard.ts`.
Este é exatamente o tipo de erro que justifica "não declarar funcionalidade
pronta sem execução mínima" (Prompt 5B §48).

## 19.6 Simplificação registrada: Offices/Memberships sem repositório de interface

`Identity` recebeu o tratamento completo de porta/adapter (interfaces
`UsuarioRepository`/`SessaoRepository` + implementação Prisma) como
referência de padrão. `Offices` e `Memberships`, por restrição de tempo
desta etapa, usam `PrismaService` diretamente dentro dos use cases, sem uma
camada de interface de repositório própria. Não é um erro silencioso — é
uma simplificação deliberada e documentada; a elevação para o padrão
completo de `Identity` é direta (extrair interface + implementação) e deve
acontecer quando esses módulos ganharem regras mais ricas.

## 19.7 Riscos

| Risco | Mitigação |
|---|---|
| RLS não aplicada ainda — isolamento depende só de guard + extensão Prisma | Testes de integração de isolamento entre tenants são o item mais crítico da próxima rodada |
| Chave JWT efêmera gerada a cada boot em desenvolvimento | Documentado e bloqueado explicitamente para produção via `env.schema.ts` |
| `hashToken`/`PasswordService` sem teste de integração contra Argon2 real | Testes unitários usam mock; comportamento real do `argon2` (biblioteca nativa) não foi exercitado em teste, só usado (sem erro) durante a instalação/build |

## 19.8 PROMPT 5C, Etapa 1 — desenho híbrido do `AuditInterceptor`

**Situação.** O prompt pede captura de "before e after" e uma lista de ~17
ações auditáveis, várias delas (login, refresh, reuso de token) sem um
recurso HTTP-REST convencional com corpo de entidade — a auditoria genérica
por interceptor (padrão AOP, olhando só para request/response) não tem como
saber, por si só, o que é "falha de login" vs. "conta bloqueada" vs. "reuso
de refresh token detectado".

**Resolução.** Em vez de um interceptor totalmente genérico (que perderia
nuance de negócio) ou chamadas manuais espalhadas por cada use case (que
duplicariam extração de ator/sessão/IP/correlationId em 17 lugares), foi
adotado um meio-termo: o `AuditInterceptor` captura genericamente tudo que é
sempre igual (correlationId, requestId, ator via `req.authUser`, IP, user
agent, resultado sucesso/falha a partir de `DomainError`/exceção), e a
nuance de negócio (por que falhou) é resolvida aproveitando um canal já
existente — o campo `meta` de `DomainError` — em vez de criar um mecanismo
novo. `RefreshTokenUseCase` agora anota
`new DomainError('SESSION_REVOKED', ..., { motivo: 'REUSO_DETECTADO' })`
especificamente no branch de reuso; o interceptor prioriza
`error.meta.motivo` sobre `error.message` ao gravar. Zero código de
auditoria dentro dos use cases — só uma anotação de `meta` num ponto que já
existia.

## 19.9 PROMPT 5C, Etapa 1 — captura de `dadosAntes` adiada

O modelo `LogAuditoria`/`AuditEntry` já suporta `dadosAntes`, mas populá-lo
de forma genérica exigiria uma leitura extra do recurso *antes* de cada
mutação decorada — o `AuditInterceptor`, que roda no limite HTTP, não tem
acesso ao estado anterior sem que o próprio use case o forneça. Nenhuma
chamada usa esse campo ainda nesta rodada; ficou registrado como TODO
explícito (não fingido como feito) em [15-audit.md](15-audit.md). Quando um
módulo precisar de diff real (ex.: `UPDATE_MEMBER_ROLE` mostrando o papel
anterior), o padrão a seguir é o use case popular `dadosAntes`/`dadosDepois`
explicitamente via `AuditService.registrar()` direto, não o interceptor.

## 19.10 PROMPT 5C, Etapa 1 — imutabilidade de `log_auditoria` ainda não é garantia de banco

"Logs de auditoria devem ser imutáveis para usuários comuns" (requisito da
Etapa 1) está satisfeito **a nível de aplicação** (nenhum código do domínio
chama `update`/`delete` em `LogAuditoria`, e o modelo está fora de
`TENANT_SCOPED_MODELS`/`SOFT_DELETE_MODELS`, então nem a extensão de
soft-delete o intercepta). Não está satisfeito **a nível de banco**
(`REVOKE UPDATE, DELETE ON log_auditoria FROM app_role` não foi aplicado —
depende da migration de RLS/permissões da Etapa 2, que por sua vez depende
de Postgres real para ser testada). Registrado como risco, não como
concluído.

## 19.11 PROMPT 5C, Etapa 3 — colunas geradas declaradas como `Unsupported` para evitar drift

Colunas `tsvector` (`GENERATED ALWAYS AS ... STORED`) criadas via migration
SQL manual (`20260731000002_search_extensions`) não têm equivalente nativo
gerenciável pelo Prisma. Se não fossem declaradas em `schema.prisma`, um
futuro `prisma migrate dev` as veria como "coluna existe no banco mas não no
schema" e geraria uma migration para **removê-las** — destruindo o índice de
busca silenciosamente na próxima sessão de desenvolvimento. Resolvido
declarando cada uma como `Unsupported("tsvector")?` (ou `String?` para
`numero_cnj_somente_digitos`, que é `text`) nos modelos afetados
(`Cliente`, `Processo`, `Documento`, `Tag`, `Comentario`) — o Prisma passa a
reconhecer a coluna como existente e não a remove, mas a expressão
`GENERATED ALWAYS`/índice GIN em si só existe na migration manual, nunca
reproduzida por `prisma migrate dev`. Disciplina necessária daqui em diante:
qualquer alteração nessas colunas exige uma nova migration manual, nunca
`prisma migrate dev` "resolvendo" a diferença sozinho.

---

**Anterior:** [18-docker-ci.md](18-docker-ci.md) · **Próximo:** [20-context-next-step.md](20-context-next-step.md)
