# 00 — Resumo Executivo

> **Quilombo Dev — Workspace Jurídico Inteligente**
> PRD Arquitetural v1.0 · 30 de julho de 2026
> Este documento é a **baseline** de todas as etapas seguintes do projeto.

---

## O produto em um parágrafo

Quilombo Dev é um workspace jurídico para escritórios de advocacia de pequeno e
médio porte que centraliza processos, documentos e prazos, e devolve a informação
certa em segundos por meio de busca global universal e resumos gerados por IA. O
software jurídico tradicional resolveu o *registro* e ignorou a *recuperação* — é
exatamente aí que o produto compete.

## Proposta de valor

**Para** escritórios de 3 a 50 pessoas **que** perdem tempo produtivo procurando
informação dispersa, **o Quilombo Dev** é um workspace jurídico inteligente **que**
centraliza o conhecimento do escritório e o torna instantaneamente recuperável.
**Diferente de** sistemas jurídicos legados, orientados a cadastro e densos de
interface, **nosso produto** é orientado a recuperação e compreensão, com IA
nativa e não cobrada à parte.

## Seis diferenciais

1. **Busca global (⌘K)** — funcionalidade âncora; busca até dentro do conteúdo dos PDFs.
2. **IA nativa e rastreável** — todo resumo cita a fonte e traz selo de geração automática.
3. **Interface limpa como requisito** — meta declarada: uso sem treinamento formal.
4. **Timeline unificada** — a história do caso contada uma vez só.
5. **Multi-tenant com isolamento tríplice** — guard + middleware + RLS no banco.
6. **LGPD e sigilo profissional como arquitetura** — auditoria de leitura inclusive.

## Escopo do MVP

Login · Dashboard · Processos · Documentos · Busca Global · Resumo por IA ·
Perfil · Notificações — mais Clientes e Administração, que são pré-requisitos
estruturais dos demais.

**Fora do MVP, declarado:** portal do cliente, financeiro, timesheet,
peticionamento, integração com tribunais, assinatura ICP-Brasil, app nativo, BI.
O modelo de domínio, porém, já prevê Portal do Cliente (campo `visibilidade`) e
integração com tribunais (campo `origem` em eventos) — as duas evoluções que
distorceriam o modelo se fossem ignoradas agora.

## Personas

| Persona | Papel | Necessidade central |
|---|---|---|
| Ricardo, 44 | Sócio | Panorama da carteira sem convocar reunião |
| Camila, 31 | Advogada — *power user* e influenciadora de adoção | Nunca perder prazo; achar a peça certa |
| Lucas, 22 | Estagiário | Entender o caso sozinho, rápido |
| Sandra, 38 | Assistente | Cadastrar rápido; responder cliente ao telefone |
| Marcos, 36 | Admin/TI | Provisionar, revogar e auditar acesso |
| Helena, 52 | Cliente *(Fase 3)* | Transparência sem precisar cobrar |

## Arquitetura em uma tela

```
┌─ FRONTEND ──────────────────────────────────────────────┐
│ Next.js 15 (App Router, RSC) · React 19 · TS strict     │
│ Tailwind 4 + shadcn/ui + Radix                          │
│ TanStack Query (servidor) · Zustand (UI) · URL (filtros)│
│ Organização feature-first, fronteiras aplicadas por lint│
└─────────────────────────┬───────────────────────────────┘
                          │ REST /api/v1 · OpenAPI 3.1 · SSE
┌─────────────────────────▼───────────────────────────────┐
│ BACKEND — NestJS · Monólito modular                     │
│ Clean Architecture pragmática (4 camadas)               │
│ DDD seletivo: completo em Processos; CRUD onde couber   │
│ 15 módulos · Guards · Interceptors · Eventos de domínio │
└──────┬──────────────┬─────────────┬─────────────────────┘
       │              │             │
  PostgreSQL 16   Redis        S3-compatible
  + pgvector      cache/fila   documentos
  + pg_trgm       BullMQ
  + RLS
                                    │
                          Provedor de IA (port/adapter)
```

## Dez decisões arquiteturais que definem o projeto

| # | Decisão | Razão |
|---|---|---|
| 1 | Monólito modular, não microsserviços | Time pequeno, domínio instável; fronteiras preparadas para extração futura |
| 2 | Isolamento de tenant em três camadas | Vazamento em dado sob sigilo é evento de extinção, não bug |
| 3 | `Usuario` global + `Membro` por tenant | Advogado atua em vários escritórios |
| 4 | Timeline unificada | Consulta cronológica é o acesso dominante; simplifica leitura e contexto de IA |
| 5 | Busca híbrida no PostgreSQL | Uma infra a menos; gatilho de migração definido (>5M docs ou p95 >400ms) |
| 6 | IA via port/adapter, prompts versionados | Troca de provedor é questão de quando, não de se |
| 7 | Toda saída de IA com fonte e selo | Risco reputacional e ético; o advogado precisa conferir |
| 8 | `visibilidade` nas entidades desde o MVP | Portal do Cliente sem migração de risco depois |
| 9 | Auditoria append-only, incluindo leitura | Sigilo profissional exige rastrear quem *leu*, não só quem escreveu |
| 10 | DDD seletivo, não uniforme | Aplicar DDD a domínio anêmico produz cerimônia, não qualidade |

## Modelo de domínio — visão macro

Seis contextos delimitados: **Identidade e Acesso** (Usuario, UserIdentity,
Sessao, Papel, Permissao) · **Organização** (Escritorio, Membro, Convite) ·
**Núcleo Jurídico** (Cliente, Processo, ParteProcesso, Prazo) · **Conteúdo**
(Documento, VersaoDocumento, EventoTimeline, Comentario) · **Inteligência**
(ResumoIA, Embedding, IndiceBusca) · **Suporte** (Notificacao, LogAuditoria).

Cinco agregados com invariantes explícitas; referência entre agregados sempre por
identificador.

## Segurança e conformidade

JWT com rotação e detecção de reuso · OAuth 2.0 + PKCE (Google e Microsoft) ·
MFA TOTP · Argon2id · RBAC + escopo de recurso, com dupla verificação (ação +
registro) · segredo de justiça sobrepondo qualquer papel · auditoria append-only
de 12 meses incluindo leitura de documento · LGPD com base legal mapeada por
finalidade, direitos do titular implementados e o escritório como controlador e o
Quilombo Dev como operador · contrato de não-treinamento com o provedor de IA.

## Design System

Azul-petróleo como marca · violeta **reservado exclusivamente** para conteúdo de
IA (reconhecimento instantâneo de origem) · Inter para interface, Source Serif 4
para leitura longa, JetBrains Mono para números processuais · escala de 4px ·
tokens semânticos que os componentes consomem (nenhuma cor bruta em componente) ·
dark mode por superfície, não por sombra · WCAG 2.1 AA como piso, verificado no CI.

Três camadas de componentes: primitivos (shadcn/Radix) → compostos de domínio
(~25 componentes catalogados) → layout.

## Roadmap

| Fase | Semanas | Entregável |
|---|---|---|
| 0 — Fundação | 1–3 | Auth, multi-tenancy com RLS validada, design system, CI/CD |
| 1 — Núcleo | 4–9 | Clientes, Processos, Documentos, Comentários, Dashboard, RBAC, Auditoria |
| 2 — Diferenciais | 10–14 | Busca global, IA com RAG e streaming, Notificações, Perfil, OAuth, Admin |
| 3 — Endurecimento | 15–18 | Performance, acessibilidade, pentest, E2E, onboarding, beta com 3–5 escritórios |
| 4 — Pós-MVP | 19+ | Portal do Cliente → Tribunais → Financeiro → Assinatura → BI |

## Métricas de sucesso do MVP

Tempo até encontrar um documento **< 15s** · adoção da busca **≥ 60% WAU** ·
processos ativos com resumo de IA **≥ 40%** · feedback positivo na IA **≥ 70%** ·
retenção WAU/MAU **≥ 55%** · p95 da busca **< 400 ms** · LCP < 2,0s · INP < 200ms.

## Três riscos principais

1. **Custo de IA** — mitigado por cache por `hashContexto`, cota por tenant, RAG
   e telemetria de custo desde o primeiro dia.
2. **Inflação de escopo** — mitigada por lista explícita de "fora do MVP" e por
   anti-persona documentada.
3. **Qualidade percebida da IA** — mitigada por feedback instrumentado, prompts
   versionados, citação obrigatória de fonte e calibragem de expectativa na copy.

## O que este documento decide (e o que não decide)

**Decide:** visão e escopo · personas · fluxos e árvore de telas · arquitetura
frontend e backend · modelo de domínio · design system · especificação funcional
dos módulos · modelo de segurança e conformidade · stack e suas justificativas ·
roadmap e estrutura de repositório.

**Não decide (próximos passos):** protótipo de alta fidelidade no Figma ·
provedor de nuvem específico e dimensionamento · precificação e planos comerciais ·
conteúdo exato dos prompts de IA · plano de importação de dados de sistemas legados ·
seleção dos escritórios do beta.

---

## Índice da documentação

| # | Documento | Conteúdo |
|---|---|---|
| 01 | [Visão de Produto](01-visao-produto.md) | Problema, visão, proposta de valor, diferenciais, escopo, métricas, princípios |
| 02 | [Personas](02-personas.md) | 6 personas, matriz persona × módulo, anti-persona |
| 03 | [Fluxos e Telas](03-fluxos-e-telas.md) | 8 fluxos detalhados, árvore de telas, estados obrigatórios, atalhos |
| 04 | [Arquitetura Frontend](04-arquitetura-frontend.md) | Estrutura, estado, dados, componentes, performance, testes |
| 05 | [Arquitetura Backend](05-arquitetura-backend.md) | Módulos, camadas, multi-tenancy, auth, autorização, filas, IA, API |
| 06 | [Modelo de Domínio](06-modelo-dominio.md) | Contextos, agregados, entidades, VOs, invariantes, decisões |
| 07 | [Design System](07-design-system.md) | Cores, tipografia, espaçamento, componentes, acessibilidade |
| 08 | [Especificação dos Módulos](08-especificacao-modulos.md) | Regras, endpoints, permissões e critérios de aceite por módulo |
| 09 | [Segurança e LGPD](09-seguranca-lgpd.md) | Ameaças, proteção de dados, conformidade, IA, checklist |
| 10 | [Roadmap e Decisões](10-roadmap-e-decisoes.md) | Justificativa da stack, monorepo, roadmap, escalabilidade, SOLID/DDD, riscos, DoD |
