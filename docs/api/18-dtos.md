# 18 — Catálogo de DTOs

> Cada DTO corresponde a um Value Object/Entidade de
> [../database/](../database/00-resumo-modelagem.md), com validação Zod na
> borda da API (reafirma
> [../05-arquitetura-backend.md §5.2](../05-arquitetura-backend.md), pipe
> `ZodValidationPipe`). Campos sensíveis (`senhaHash`, `mfaSegredo`,
> `refreshTokenHash`) **nunca** aparecem em nenhum DTO de saída.

## 18.1 Identity

### `CriarUsuarioDTO` (entrada de `/v1/auth/register`)
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `nome` | string | ✓ | 2–60 caracteres |
| `sobrenome` | string | ✓ | 2–60 caracteres |
| `email` | string | ✓ | RFC 5322, normalizado para minúsculas |
| `senha` | string | ✓ | mín. 12 caracteres, checado contra lista de vazamentos (k-anonymity) |
| `nomeEscritorio` | string | ✓ | 2–120 caracteres |

### `AtualizarUsuarioDTO` (entrada de `PATCH /v1/me`)
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `nome`, `sobrenome` | string | — | 2–60 |
| `telefone` | string | — | E.164 |
| `cargo` | string | — | máx. 80 |
| `oab` | `{ numero: string, uf: string }` | — | `uf` 2 letras |

### `UsuarioPublicoDTO` (saída)
`id`, `nome`, `sobrenome`, `nomeExibicao`, `email`, `avatarUrl`, `tema`,
`idioma`, `fusoHorario` — nunca `senhaHash`/`mfaSegredo`.

## 18.2 Memberships

### `ConvidarMembroDTO`
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `email` | string | ✓ | RFC 5322 |
| `papelId` | uuid | ✓ | Deve existir e pertencer ao escritório ou ser papel de sistema |

### `MembroResumoDTO`
`id`, `usuario: { nome, email, avatarUrl }`, `papel`, `status`, `entrouEm`.

## 18.3 Offices

### `AtualizarEscritorioDTO`
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `nomeFantasia` | string | — | 2–120 |
| `razaoSocial` | string | — | Obrigatório se `cnpj` presente |
| `cnpj` | string | — | 14 dígitos, dígito verificador válido |
| `email` | string | — | RFC 5322 |
| `telefone` | string | — | E.164 |
| `endereco` | objeto (ver [../database/02-convencoes-dados.md §2.13](../database/02-convencoes-dados.md)) | — | `uf` 2 letras, `cep` 8 dígitos |

## 18.4 Clients

### `CriarClienteDTO`
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `tipo` | `PESSOA_FISICA`\|`PESSOA_JURIDICA` | ✓ | — |
| `nome` | string | ✓ | 2–120 |
| `razaoSocial` | string | Condicional | Obrigatório se `PESSOA_JURIDICA` |
| `cpf` | string | — | 11 dígitos, dígito verificador válido |
| `cnpj` | string | — | 14 dígitos, dígito verificador válido |
| `emails` | string[] | — | cada item RFC 5322 |
| `telefones` | string[] | — | cada item E.164 |
| `responsavelId` | uuid | — | `Membro` ativo do escritório |

### `ClienteResumoDTO` (item de lista)
`id`, `nome`, `tipo`, `documento` (mascarado), `processosAtivos: number`,
`responsavel: { nome }`.

### `ClienteDetalheDTO`
Todos os campos de `CriarClienteDTO` + `id`, `status`, `criadoEm`,
`processosAtivos`, `documentosCount`.

## 18.5 Legal Cases

### `CriarProcessoDTO`
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `titulo` | string | ✓ | 3–200 |
| `clienteId` | uuid | ✓ | Cliente do mesmo escritório |
| `numeroCnj` | string | — | 20 dígitos, dígito verificador módulo 97 |
| `numeroInterno` | string | — | máx. 40 |
| `area` | string | — | máx. 60 |
| `tipo` | `JUDICIAL`\|`ADMINISTRATIVO`\|`CONSULTIVO`\|`EXTRAJUDICIAL` | — | padrão `JUDICIAL` |
| `tribunal`, `comarca`, `vara` | string | — | máx. 100 |
| `poloCliente` | `ATIVO`\|`PASSIVO`\|`TERCEIRO` | ✓ | — |
| `responsavelPrincipalId` | uuid | ✓ | `Membro` ativo |
| `valorCausaCentavos` | integer | — | ≥0 |
| `segredoJustica` | boolean | — | padrão `false` |

### `ProcessoResumoDTO` (item de lista)
`id`, `titulo`, `numeroCnj`, `status`, `prioridade`, `cliente: {nome}`,
`responsavel: {nome, avatarUrl}`, `proximaDataRelevante`, `versao`.

### `ProcessoDetalheDTO`
Todos os campos de `CriarProcessoDTO` + `id`, `status`, `versao`,
`criadoEm`, `atualizadoEm`, `resumoIaVigente` (resumo do `ResumoIA` vigente,
se houver), `tagsAtivas: TagDTO[]`.

### `CriarPrazoDTO`
`titulo` (✓), `tipo` (✓, enum `TipoPrazo`), `dataVencimento` (✓, `YYYY-MM-DD`),
`horaVencimento` (opcional, `HH:mm`), `responsavelId` (✓), `prioridade`
(padrão `MEDIA`).

### `CriarParticipanteDTO`
`tipo` (✓, enum `TipoParticipante` ampliado —
[../database/04-entidades-clientes-processos.md §4.3.1](../database/04-entidades-clientes-processos.md)),
`natureza` (✓), `nome` (✓, 2–150), `documento` (opcional), `clienteId`
(opcional).

## 18.6 Documents

### `PresignDocumentoDTO`
`nomeArquivo` (✓), `mimeType` (✓, allowlist —
[../08-especificacao-modulos.md §8.3](../08-especificacao-modulos.md)),
`tamanhoBytes` (✓, ≤104857600), `processoId` (opcional), `pastaId`
(opcional).

### `DocumentoDetalheDTO`
`id`, `nome`, `nomeOriginal`, `mimeType`, `tamanhoBytes`, `tipo`,
`categoria`, `confidencialidade`, `visibilidade`, `statusUpload`,
`statusProcessamento`, `statusAntivirus`, `versaoVigente: {numero, criadoEm}`,
`autorUpload: {nome}`, `tagsAtivas: TagDTO[]`, `versao`.

### `CriarPastaDTO`
`nome` (✓, 1–100), `processoId` (opcional), `pastaPaiId` (opcional).

## 18.7 Timeline

### `CriarEventoTimelineDTO`
`tipo` (✓, restrito a `ANOTACAO`\|`PERSONALIZADO`), `titulo` (✓, 2–150),
`descricao` (opcional), `dataEvento` (opcional, padrão `now()`).

### `EventoTimelineDTO` (saída)
`id`, `tipo`, `titulo`, `descricao`, `dataEvento`, `dataRegistro`, `origem`,
`autor: {nome}|null`, `entidadeRelacionada: {tipo, id}|null`, `visibilidade`,
`fixado`.

## 18.8 Comments

### `CriarComentarioDTO`
`conteudo` (✓, 1–5000, sanitizado como rich text), `comentarioPaiId`
(opcional, deve ser comentário raiz), `mencoes` (opcional, array de `membroId`).

### `ComentarioDTO` (saída)
`id`, `autor: {nome, avatarUrl}`, `conteudo`, `comentarioPaiId`, `editado`,
`criadoEm`.

## 18.9 Notifications

### `NotificacaoDTO` (saída)
`id`, `tipo`, `titulo`, `mensagem`, `urlAcao`, `prioridade`, `lidaEm`,
`criadoEm`.

### `PreferenciaNotificacaoDTO`
`tipoNotificacao` (✓), `inApp` (boolean), `email` (boolean), `frequencia`
(`IMEDIATA`\|`DIARIA`\|`SEMANAL`\|`NUNCA`).

## 18.10 AI

### `SolicitarResumoDTO`
`tipoResumo` (✓, enum `TipoResumoIA`).

### `ResumoIaDTO` (saída — campos de custo condicionais a `ai:usage:read`)
`id`, `processoId`, `tipoResumo`, `versaoResumo`, `status`, `conteudo`,
`modelo`, `promptVersion`, `geradoEm`, `vigente`, `feedback`,
`fontes: FonteIaDTO[]`, `[condicional] tokensEntrada`,
`[condicional] tokensSaida`, `[condicional] custoEstimadoCentavos`.

### `FonteIaDTO`
`id`, `sourceType`, `sourceId`, `trechoOuReferencia`, `ordem`.

## 18.11 Search

### `SearchResultDTO`
`query`, `groups: SearchGroupDTO[]`.

### `SearchGroupDTO`
`type`, `total`, `items: SearchItemDTO[]`.

### `SearchItemDTO`
`id`, `snippet`, `score`, `url` + campos específicos do tipo (`titulo`,
`numeroCnj` para processos; `nome` para clientes/documentos).

## 18.12 Tags

### `CriarTagDTO`
`nome` (✓, 1–40, único case-insensitive por escritório), `cor` (✓, hex),
`descricao` (opcional).

## 18.13 Convenção de validação

Todo DTO de entrada é validado por schema Zod na borda (reafirma
[../04-arquitetura-frontend.md §4.5](../04-arquitetura-frontend.md) — o
**mesmo** schema Zod usado no formulário do frontend gera o tipo TypeScript
compartilhado via OpenAPI, eliminando divergência entre validação de
cliente e servidor). Campos não declarados no DTO são **rejeitados**
(`.strict()`), nunca ignorados silenciosamente — mitigação estrutural de
mass assignment (reafirma
[../database/08-permissoes-seguranca.md §8.4](../database/08-permissoes-seguranca.md)).

---

**Anterior:** [17-errors.md](17-errors.md) · **Próximo:** [19-openapi.md](19-openapi.md)
