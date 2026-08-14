# 03 — Autorização

> Reafirma [../05-arquitetura-backend.md §5.6](../05-arquitetura-backend.md) e
> [../database/08-permissoes-seguranca.md](../database/08-permissoes-seguranca.md).

## 3.1 RBAC com regras contextuais (recapitulação)

Toda rota protegida declara uma **permissão** no formato `recurso:acao:escopo`
(ex.: `case:read:assigned`). A verificação acontece em **duas etapas
obrigatórias**, nunca uma sozinha:

1. **Guard de ação** — o papel do `Membro` autenticado tem a permissão
   declarada na rota?
2. **Autorização de recurso** (no use case) — o registro específico
   solicitado está dentro do escopo do usuário (é responsável, é da equipe,
   é do mesmo tenant, não está sob segredo de justiça sem acesso)?

Cada endpoint desta especificação declara a permissão exigida em um campo
`Permissão:` — sempre as duas etapas, nunca implícita.

## 3.2 Escopos de permissão

| Escopo | Significado |
|---|---|
| `ALL` | Todo registro do escritório |
| `TEAM` | Registros onde o usuário pertence à equipe (`ProcessoMembro`) |
| `ASSIGNED` | Registros onde o usuário é o responsável/autor direto |
| `OWN` | Apenas registros criados pelo próprio usuário |

## 3.3 Ownership

"Dono" de um recurso é resolvido por entidade:

| Recurso | Campo de ownership |
|---|---|
| Processo | `responsavelPrincipalId` + `ProcessoMembro` (equipe) |
| Documento | `autorUploadId` (para escopo `OWN`) |
| Comentário | `autorId` (edição/exclusão restrita ao autor, independente de papel) |
| Cliente | `responsavelId` (informativo — leitura de cliente é ampla por padrão, reafirma [../database/08-permissoes-seguranca.md §8.3](../database/08-permissoes-seguranca.md)) |

## 3.4 Segredo de justiça e confidencialidade

`Processo.segredoJustica = true` e `Documento.confidencialidade = CONFIDENCIAL`
são resolvidos **na autorização de recurso**, nunca no guard de ação — mesmo
um usuário com `case:read:all` recebe **404** (não 403) se o processo está
sob segredo de justiça e ele não é responsável/equipe/SOCIO/OWNER. Reafirma
[../database/04-entidades-clientes-processos.md §4.2.5](../database/04-entidades-clientes-processos.md)
e [../ux/04-navigation.md §4.10](../ux/04-navigation.md).

## 3.5 Escopo do escritório (tenant)

Resolvido pela claim `tenantId` do access token — nunca por parâmetro de
request. Todo endpoint desta especificação opera implicitamente "dentro do
escritório ativo da sessão"; nenhum endpoint aceita `escritorioId` como
parâmetro de entrada (isso seria vetor de troca de tenant por manipulação de
request). Reafirma [../database/01-estrategia-multitenancy.md §1.2](../database/01-estrategia-multitenancy.md).

## 3.6 Escopo do processo

`case:read:assigned` retorna apenas processos onde `responsavelPrincipalId =
membroAtual.id` **ou** existe `ProcessoMembro` ativo do usuário.
`case:read:team` amplia para todos os processos onde qualquer equipe que o
usuário integra também participa (via `Equipe`, escopo raramente usado na
Fase 1). `case:read:all` remove esse filtro, mas ainda passa pelo filtro de
segredo de justiça do §3.4.

## 3.7 Escopo do documento

Documento herda o escopo de acesso do processo ao qual está vinculado (se
vinculado); documento sem processo (`processoId = null`) usa
`document:read:{escopo}` com ownership por `autorUploadId`. Documento
`CONFIDENCIAL` exige, adicionalmente, que o usuário tenha acesso ao processo
sob segredo de justiça equivalente (mesma checagem do §3.4), mesmo que o
processo em si não esteja sob segredo de justiça — confidencialidade de
documento é independente da confidencialidade do processo.

## 3.8 Catálogo de permissões usadas nesta especificação

Reafirma [../database/08-permissoes-seguranca.md §8.3](../database/08-permissoes-seguranca.md).
Permissões citadas ao longo de [04](04-identity.md) a [16](16-audit.md):

```
office:read          office:update         office:delete
member:invite         member:remove         member:update-role      member:read
client:create         client:read           client:update           client:delete
case:create           case:read:{escopo}    case:update              case:delete
case:team:manage      case:read:confidential
document:create       document:read:{escopo} document:download      document:delete
document:folder:manage
comment:create        comment:update        comment:delete (própria autoria sempre; demais por papel)
tag:manage
ai:summarize          ai:usage:read
notification:manage   (sempre próprias, sem escopo de papel)
audit:read
```

## 3.9 Resposta de autorização negada

| Situação | Status | Corpo |
|---|---|---|
| Sem permissão de ação (guard) | `403 Forbidden` | `code: FORBIDDEN`, mensagem genérica |
| Sem acesso ao recurso específico (segredo de justiça, fora do tenant, fora do escopo) | `404 Not Found` | Indistinguível de "não existe" |
| Token ausente/inválido/expirado | `401 Unauthorized` | `code: UNAUTHENTICATED` / `TOKEN_EXPIRED` |

A escolha entre 403 e 404 nunca é arbitrária: 403 é usado apenas quando a
**existência do recurso já é pública/conhecida** (ex.: usuário sabe que
existe uma tela de administração, só não tem o papel); 404 é usado sempre que
revelar "existe mas você não pode ver" já seria vazamento de informação
(processo/documento específico).

---

**Anterior:** [02-autenticacao.md](02-autenticacao.md) · **Próximo:** [04-identity.md](04-identity.md)
