# 21 — Segurança da API

> Reafirma [../09-seguranca-lgpd.md](../09-seguranca-lgpd.md) e
> [../database/08-permissoes-seguranca.md](../database/08-permissoes-seguranca.md) —
> aqui, aplicado especificamente à camada de contrato HTTP.

## 21.1 JWT

Assinatura RS256 (par de chaves assimétrico, permite validação por serviços
que não precisam da chave privada), `kid` no header para suportar rotação de
chave sem invalidar tokens já emitidos. Claims mínimas necessárias —
reafirma [02-autenticacao.md §2.1](02-autenticacao.md); nenhum dado sensível
(CPF, e-mail completo) na claim, apenas identificadores.

## 21.2 CSRF

Como o refresh token vive em cookie `httpOnly` com `SameSite=Lax`, o risco de
CSRF é mitigado estruturalmente para a maioria das rotas (requisição
cross-site não reenvia o cookie em `POST`). Para rotas mutantes acessadas por
formulário HTML tradicional (nenhuma nesta API — tudo é `fetch`/XHR com JSON),
`SameSite=Lax` já bloqueia. Rotas de callback OAuth usam `state` assinado
como proteção adicional (reafirma
[02-autenticacao.md §2.5](02-autenticacao.md)).

## 21.3 CORS

Reafirma [01-convencoes.md §1.15](01-convencoes.md) — origem restrita ao
domínio oficial do frontend, nunca wildcard em rota autenticada.

## 21.4 Headers de segurança (aplicados pela API/proxy)

Reafirma [../09-seguranca-lgpd.md §9.4](../09-seguranca-lgpd.md): CSP
estrita, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`
com `preload`.

## 21.5 SQL Injection

Eliminado estruturalmente — todo acesso a dado passa pelo Prisma Client
(queries parametrizadas); `$queryRaw` só com `Prisma.sql` tagged template,
nunca concatenação de string, reafirma
[../database/08-permissoes-seguranca.md §8.4](../database/08-permissoes-seguranca.md).
Nenhum endpoint desta especificação aceita fragmento de SQL como parâmetro.

## 21.6 Mass Assignment

Todo DTO de entrada é `.strict()` (rejeita campo não declarado) — reafirma
[18-dtos.md §18.13](18-dtos.md). Campos estruturalmente **nunca** aceitos de
fora do controle do backend: `id`, `escritorioId`, `versao`, `criadoEm`,
`status` calculado (ex.: `StatusPrazo.ATRASADO`), `papel` (alterado apenas
por endpoint dedicado com sua própria checagem de auto-escalonamento).

## 21.7 IDOR

Reafirma [03-autorizacao.md §3.9](03-autorizacao.md) — todo recurso é
buscado por `(id, escritorioId)` implícito via contexto de tenant, nunca por
`id` isolado; resposta é `404` (não `403`) quando o recurso existe mas está
fora do escopo do usuário, para não confirmar sua existência.

## 21.8 LGPD

- `GET /v1/me/export` e `POST /v1/me/delete-request` são os únicos
  endpoints de exercício de direito do titular na Fase 1 — reafirma
  [../database/10-soft-delete-retencao-lgpd.md §10.12](../database/10-soft-delete-retencao-lgpd.md).
- Toda resposta de listagem de `Cliente`/`ParteProcesso` mascara CPF/CNPJ
  por padrão (`***.**6-78`); campo completo só é retornado no detalhe
  (`GET /v1/clients/:id`) a quem tem `client:read`.
- Nenhum endpoint de busca (`/v1/search`) retorna CPF/CNPJ completo no
  snippet, mesmo mascarado — apenas nome.

## 21.9 Auditoria (na camada de API)

Todo endpoint marcado como sensível em
[../database/06-entidades-ia-notificacoes-auditoria.md §6.6.1](../database/06-entidades-ia-notificacoes-auditoria.md)
gera `LogAuditoria` via interceptor — a especificação de cada endpoint em
`04` a `16` desta pasta assume esse comportamento implicitamente para as
ações listadas naquele catálogo (login, download, alteração de permissão,
etc.), sem repetir "isto é auditado" em cada endpoint individualmente.

## 21.10 Antivírus e conteúdo malicioso

`GET /v1/documents/:id/download` e `/preview` retornam `423 Locked` para
documento com `statusAntivirus = INFECTADO`, incondicionalmente — reafirma
[10-documents.md §10.5](10-documents.md). Nenhum bypass por papel/permissão.

## 21.11 Injeção de prompt (camada de IA)

Conteúdo de documento entra no `ContextBuilder` como dado delimitado, nunca
como instrução — reafirma
[../09-seguranca-lgpd.md §9.8](../09-seguranca-lgpd.md). A API não expõe
nenhum endpoint que permita ao usuário final compor o prompt diretamente
(`SolicitarResumoDTO` aceita apenas `tipoResumo`, um enum fechado — nunca
texto livre que vire instrução para o modelo).

---

**Anterior:** [20-performance.md](20-performance.md) · **Próximo:** [22-decisoes.md](22-decisoes.md)
