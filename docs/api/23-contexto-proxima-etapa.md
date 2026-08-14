# 23 — Contexto Oficial para o Prompt 5

## CONTEXTO OFICIAL PARA O PROMPT 5

**Escopo desta etapa.** Especificação completa da API REST do Quilombo Dev
em `docs/api/` (24 arquivos), sem código, sem Controllers/Services/Prisma/SQL.
Formaliza em nível de contrato HTTP o que já era oficial em `docs/00` a
`docs/10`, `docs/database/` e `docs/ux/`. Esta é a fonte única da verdade da
API — todo desenvolvimento de Backend (NestJS) e Frontend (Next.js) deve
respeitá-la exatamente.

**Convenções gerais.** REST sobre `/api/v1` (versionamento por URL, major
version só em mudança quebra-compatibilidade com 6 meses de depreciação
anunciada) · JSON em camelCase · UTC em ISO 8601 · paginação por cursor
(exceto telas administrativas de baixo volume) · filtros por query param
nomeado, operadores por sufixo (`campo[gte]`) · erro único RFC 9457 Problem
Details com `code` estável e `correlationId` · idempotência via
`Idempotency-Key` em `POST` com efeito colateral · rate limit em três
camadas (tenant/usuário/IP) · `ETag` em recurso individual · CORS restrito ao
domínio oficial do frontend · `X-Tenant-Id` **nunca** aceito do cliente —
tenant é sempre resolvido da claim do JWT.

**Autenticação.** Access token JWT (RS256, 15 min, claims mínimas) + refresh
token (cookie httpOnly, 7/30 dias, rotação com detecção de reuso por
`familyId`) · revogação em tempo real via denylist Redis por `sessionId` ·
OAuth 2.0 + PKCE para Google/Microsoft · MFA TOTP com challenge token
intermediário · endpoint de troca de escritório ativo
(`POST /v1/auth/switch-office`) formalizado nesta etapa.

**Autorização.** RBAC com regras contextuais: guard de ação (papel tem a
permissão `recurso:acao:escopo`?) **+** autorização de recurso no use case
(o registro específico está no escopo do usuário — `ALL`/`TEAM`/`ASSIGNED`/
`OWN` — e não está bloqueado por segredo de justiça/confidencialidade?).
Segredo de justiça e confidencialidade sempre retornam `404`, nunca `403` —
indistinguível de "não existe". `escritorioId` nunca é parâmetro de entrada
de nenhum endpoint.

**Módulos e endpoints.** 12 grupos de recursos documentados endpoint a
endpoint (método, permissão, body, resposta, erros, regras): Identity,
Offices, Memberships, Users, Clients, Legal Cases (CRUD + equipe +
participantes + prazos + relacionados + tags), Documents (upload direto ao
storage via URL pré-assinada + pastas hierárquicas + versionamento
imutável), Timeline (com eventos `PRAZO` como projeção somente-leitura de
`Prazo`, nunca a origem da verdade), Comments (thread de 1 nível, edição
restrita à autoria), Notifications (central + SSE de tempo real), AI
(geração assíncrona + streaming SSE com eventos `token`/`source`/`done`/
`error`, custo condicional a `ai:usage:read`), Search (busca híbrida
agrupada por tipo, ranking com correspondência exata de número no topo),
Audit (append-only, filtro por ator/recurso/período).

**Uploads.** Documento nunca trafega pela API — fluxo em dois passos
(`presign` → PUT direto ao storage → `confirm`). Antivírus obrigatório;
documento `INFECTADO` bloqueia download/preview com `423 Locked`
incondicional. Pipeline assíncrono (antivírus → extração → thumbnail →
índice → embeddings) não bloqueia visualização do metadado.

**Tratamento de erro.** RFC 9457 Problem Details com `type`, `title`,
`status`, `detail`, `instance`, `code`, `correlationId`, `fieldErrors`,
`meta`. Catálogo de status: 400/401/403/404/409/422/423/429/500/503, cada um
com semântica fixa (ex.: 404 nunca revela existência negada por permissão).

**DTOs.** Catalogados por módulo em [18-dtos.md](18-dtos.md), todos
`.strict()` (mass assignment estruturalmente impossível), validação Zod
compartilhada entre frontend e backend via schema único.

**OpenAPI.** Gerado automaticamente de decorators NestJS + Zod — nunca
escrito à mão; divergência do contrato descrito nesta pasta é bug de
implementação. `operationId` em `{método}{Recurso}[Ação]` camelCase, base
para os hooks gerados do TanStack Query no frontend.

**Performance.** Metas de latência formalizadas como contrato (busca p95
<400ms, primeiro token de IA <2s, listagem <150ms) — regressão bloqueia
deploy. Sem endpoint de batch genérico na Fase 1 (decisão deliberada, não
lacuna). N+1 prevenido por `include` explícito + teste de contagem de
queries no CI.

**Segurança.** JWT RS256 com rotação de chave (`kid`) · CSRF mitigado
estruturalmente por `SameSite=Lax` + `state` assinado em OAuth · SQL
injection eliminado por queries parametrizadas do Prisma · IDOR eliminado
por busca sempre `(id, escritorioId)` implícito + resposta 404 · mass
assignment eliminado por DTOs `.strict()` · CPF/CNPJ mascarado por padrão em
listagem e busca.

**Conflitos identificados.** Nenhum. Esta etapa é estritamente aditiva —
resolveu as pendências deixadas explicitamente em aberto pela etapa de UX
(streaming SSE de IA e notificações, payload de busca agrupado, endpoints de
troca de escritório/mover documento/marcar notificações em lote), sem
contradizer arquitetura, banco de dados ou permissões.

**Pendências explícitas para a implementação Backend (Prompt 5):**
1. Decidir o mecanismo exato de autenticação do `EventSource` nos dois
   endpoints SSE (cookie httpOnly vs. polyfill com header `Authorization`).
2. Configurar a geração automática do OpenAPI 3.1 a partir de
   `@nestjs/swagger` + adaptador Zod, incluindo a extensão customizada
   `x-sse-events` para os endpoints de streaming.
3. Escolher e configurar o provedor de e-mail transacional (verificação,
   convite, recuperação de senha) — não definido em nenhuma etapa anterior.
4. Definir estratégia de contract testing entre o OpenAPI gerado e a suíte
   de testes de integração.
5. Confirmar, na implementação, que os `code` de erro catalogados em
   [17-errors.md](17-errors.md) são exaustivos frente aos casos de uso reais
   descobertos durante a implementação — novos `code` podem surgir, mas
   devem ser adicionados ao catálogo desta pasta antes do merge, não depois.

**O que a implementação Backend deve tratar como imutável vindo desta
etapa:** todo endpoint, DTO, código de erro, regra de autorização e meta de
performance documentados em `docs/api/00` a `docs/api/21` — o Backend em
NestJS é escrito para servir exatamente este contrato, não para redesenhá-lo
durante a implementação.

---

**Anterior:** [22-decisoes.md](22-decisoes.md) · **Início:** [00-resumo.md](00-resumo.md)
