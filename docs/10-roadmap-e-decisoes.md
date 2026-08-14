# 10 — Roadmap, Estrutura de Projeto e Decisões Técnicas

---

## 10.1 Justificativa das tecnologias

Cada escolha abaixo tem uma alternativa considerada e um motivo de rejeição. Sem
isso, "stack moderna" é preferência pessoal disfarçada de arquitetura.

### Frontend

| Escolha | Por quê | Alternativa rejeitada |
|---|---|---|
| **Next.js 15 (App Router)** | RSC reduz JS no cliente (importa no notebook do escritório); streaming resolve o Dashboard multi-bloco; roteamento por arquivo com layouts aninhados encaixa na estrutura de abas do processo; ecossistema maduro e contratação fácil | *Vite SPA*: exigiria construir SSR, streaming e code splitting à mão. *Remix*: excelente, mas ecossistema e mercado menores |
| **React 19** | Server Components, Actions, `useOptimistic`; maior pool de talento do mercado | *Vue/Svelte*: DX ótima, mas menor disponibilidade de profissionais no Brasil |
| **TypeScript strict** | Domínio jurídico tem regras densas; tipo é documentação executável. Contrato compartilhado com o backend | *JavaScript*: inviável em produto com dado sensível |
| **Tailwind CSS 4** | Design system via tokens, zero CSS morto, consistência forçada, build rápido | *CSS-in-JS*: custo em runtime e atrito com RSC. *CSS Modules*: mais verboso, sem sistema de tokens embutido |
| **shadcn/ui + Radix** | Código no nosso repositório (não dependência opaca), acessibilidade de primeira linha, customizável até o fim | *MUI/Ant*: opinativos demais, difíceis de descaracterizar, bundle grande |
| **TanStack Query** | Cache, invalidação, revalidação, estados de erro e retry resolvidos; elimina 80% do state management manual | *Redux Toolkit*: boilerplate para um problema já resolvido. *SWR*: bom, mas menos recursos |
| **Zustand** | 1 kB, sem boilerplate, para o pouco estado global de UI que existe | *Context*: re-render em cascata. *Redux*: desproporcional |
| **React Hook Form + Zod** | Formulários grandes sem re-render; schema único valida e tipa | *Formik*: performance inferior. Validação manual: insustentável |

### Backend

| Escolha | Por quê | Alternativa rejeitada |
|---|---|---|
| **NestJS** | DI nativa viabiliza Clean Architecture sem gambiarra; modularidade real; TypeScript de ponta a ponta compartilhando tipos com o frontend; guards/interceptors são o encaixe natural para autorização e auditoria transversais | *Express puro*: reinventar estrutura. *Fastify puro*: rápido, sem arquitetura. *Java/Spring*: excelente, mas fragmenta o time e a linguagem. *Go*: performático demais para o problema, ecossistema menor no domínio |
| **PostgreSQL 16** | Transações confiáveis para dado jurídico; JSONB para campos customizados; full-text nativo; `pgvector` para busca semântica; RLS para isolamento de tenant; extremamente conhecido | *MongoDB*: consistência transacional fraca em domínio relacional. *MySQL*: sem pgvector nem RLS equivalentes |
| **pgvector** | Busca semântica dentro do mesmo banco: uma infra a menos, consistência transacional com o dado principal | *Pinecone/Weaviate*: mais um serviço, mais custo, mais falha possível — desnecessário no volume do MVP |
| **Prisma** | Type-safety ponta a ponta, migrações versionadas, extensões que permitem injetar `tenantId` globalmente | *TypeORM*: histórico de instabilidade. *Drizzle*: promissor, ecossistema mais novo. *SQL puro*: perde type-safety |
| **Redis** | Cache, denylist de sessão, rate limit e backend do BullMQ — quatro necessidades, uma infra | *Memcached*: sem estruturas ricas nem persistência |
| **BullMQ** | Processamento de documento, IA e notificação são inerentemente assíncronos; retry, DLQ e agendamento prontos | *SQS*: acopla à AWS. *Cron*: sem retry, sem observabilidade |
| **S3-compatible** | Padrão de mercado, barato, URLs pré-assinadas, versionamento, portável entre provedores | *Filesystem*: não escala, não replica. *Banco*: erro clássico |

### IA

| Escolha | Por quê |
|---|---|
| **Padrão Port/Adapter** | Provedor de IA muda por preço, qualidade e contrato de privacidade. Acoplar a um fornecedor é dívida garantida |
| **RAG com pgvector** | Contexto jurídico é longo; enviar tudo é caro, lento e degrada qualidade |
| **Prompts versionados em código** | Sem versão registrada, é impossível diagnosticar regressão de qualidade |
| **Streaming (SSE)** | Percepção de velocidade determina adoção da funcionalidade |

### Infraestrutura

| Camada | Escolha | Motivo |
|---|---|---|
| Hospedagem web | Vercel (ou container em qualquer cloud) | Otimizado para Next.js; portável se necessário |
| API e workers | Container (ECS/Cloud Run/Fly.io) | Portabilidade; sem lock-in de runtime |
| Banco | Postgres gerenciado (RDS/Neon/Supabase) | Backup, PITR e réplica sem operar banco |
| Storage | S3 / R2 | Padrão e barato |
| Observabilidade | OpenTelemetry + Grafana/Datadog/Sentry | Padrão aberto, sem lock-in de instrumentação |
| CI/CD | GitHub Actions | Integração natural com o fluxo de PR |
| IaC | Terraform | Infra reprodutível e auditável |

### Decisões deliberadamente adiadas

Microsserviços · Kubernetes · Elasticsearch · GraphQL · App mobile nativo ·
Event sourcing. Todas resolvem problemas que **ainda não temos**. Cada uma tem um
gatilho objetivo de reavaliação registrado em §10.5.

---

## 10.2 Estrutura do repositório (monorepo)

```
quilombo-dev/
├── apps/
│   ├── web/                    # Next.js — ver 04
│   ├── api/                    # NestJS — ver 05
│   └── workers/                # Consumidores BullMQ (mesma base da api)
│
├── packages/
│   ├── shared-types/           # Tipos gerados do OpenAPI + tipos comuns
│   ├── validators/             # CPF, CNPJ, CNJ, OAB — usados nos dois lados
│   ├── ui/                     # (futuro) design system extraído
│   ├── config-eslint/
│   ├── config-typescript/
│   └── config-tailwind/
│
├── docs/                       # Esta documentação
│   ├── 01-visao-produto.md
│   ├── ...
│   ├── adr/                    # Architecture Decision Records
│   └── api/                    # OpenAPI gerado
│
├── infra/
│   ├── terraform/
│   ├── docker/
│   └── scripts/
│
├── .github/workflows/
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

**Por que monorepo:** validadores de CPF/CNPJ/CNJ precisam ser idênticos nos dois
lados (divergência = dado inconsistente) · tipos da API compartilhados sem
publicar pacote · uma mudança de contrato é um único PR atômico · Turborepo dá
build incremental e cache.

**Por que não polyrepo:** para um time pequeno, sincronizar contrato entre
repositórios é custo puro sem benefício.

### Convenções
- Arquivos e pastas em `kebab-case`.
- Sufixo por papel: `.controller.ts`, `.use-case.ts`, `.repository.ts`,
  `.entity.ts`, `.vo.ts`, `.schema.ts`, `.mapper.ts`.
- Componentes React em `PascalCase` dentro de arquivo `kebab-case`.
- Conventional Commits.
- Branches: `main` (produção) · `develop` (integração) · `feature/*` · `fix/*` ·
  `chore/*`.
- Todo PR: descrição, checklist, screenshot em mudança de UI, testes passando.

---

## 10.3 Roadmap técnico

### Fase 0 — Fundação (semanas 1–3)
Monorepo, CI/CD, ambientes · Design System base (tokens, tema, primitivos,
Storybook) · Esqueleto NestJS com camadas e módulos compartilhados · Prisma +
migrações + seed · Autenticação e-mail/senha · Multi-tenancy com RLS validada por
teste · AppShell + navegação · Observabilidade (logs, tracing, erro).
**Entregável:** login funcional, tenant isolado, base pronta.

### Fase 1 — Núcleo (semanas 4–9)
Clientes (CRUD) · Processos (cadastro, lista, detalhe, timeline, partes, prazos) ·
Documentos (upload, versionamento, preview, pipeline de processamento) ·
Comentários e menções · Dashboard v1 · RBAC completo · Auditoria.
**Entregável:** o produto já é usável para trabalho real.

### Fase 2 — Diferenciais (semanas 10–14)
Busca global híbrida + command palette · IA: resumo de processo e de documento,
com RAG, streaming e citação de fonte · Notificações (in-app + e-mail + digest) ·
Perfil completo (MFA, sessões, privacidade) · OAuth Google e Microsoft ·
Administração (usuários, permissões, auditoria).
**Entregável:** MVP completo, pronto para beta fechado.

### Fase 3 — Endurecimento e beta (semanas 15–18)
Otimização de performance (orçamentos do §4.7) · Acessibilidade AA verificada ·
Pentest e correções · Testes E2E das 8 jornadas críticas · Onboarding e tour ·
Documentação de ajuda · Beta com 3–5 escritórios · Instrumentação de telemetria.
**Entregável:** produto lançável.

### Fase 4 — Pós-MVP (a partir da semana 19)
Ordem prevista por impacto: Portal do Cliente · Integração com tribunais
(PJe/Projudi/e-SAJ) · Financeiro e timesheet · Assinatura digital · Relatórios e BI ·
App mobile · Automação de workflows · IA generativa de minutas.

---

## 10.4 Escalabilidade

### Eixos e estratégias

| Eixo | Gargalo esperado | Estratégia |
|---|---|---|
| **Tenants** | Contenção de conexões | PgBouncer; particionamento por `tenant_id` acima de ~1000 tenants |
| **Leitura** | Dashboard e listas | Réplicas de leitura; views materializadas atualizadas por evento; cache Redis com invalidação por evento |
| **Documentos** | Storage e pipeline | Storage é elástico por natureza; workers escalam horizontalmente por profundidade de fila |
| **Busca** | Latência da similaridade vetorial | Índice HNSW ajustado; pré-filtro por tenant; migrar para OpenSearch se >5M docs/tenant |
| **IA** | Custo e rate limit do provedor | Cache agressivo por `hashContexto`; cota por tenant; fila com concorrência limitada; roteamento por modelo conforme complexidade da tarefa |
| **Tempo real** | Conexões SSE | SSE com Redis pub/sub entre instâncias |

### Escala horizontal
API sem estado (sessão em Redis, nada em memória local) · workers escalam
independentemente · frontend em CDN/edge · banco escala primeiro verticalmente
(mais simples e suficiente por muito tempo), depois com réplicas de leitura, e só
então com particionamento.

### Caminho de extração para serviços
Se e quando necessário, a ordem natural — porque são os módulos com fronteira
mais limpa e perfil de carga mais distinto:
1. **Processamento de documentos** (CPU-bound, picos)
2. **Serviço de IA** (custo e rate limit próprios)
3. **Busca** (perfil de leitura próprio)

O monólito modular já está desenhado para permitir isso: comunicação por
interface e evento, sem acoplamento por tabela compartilhada entre módulos.

---

## 10.5 Gatilhos de reavaliação arquitetural

Registrar o gatilho evita tanto a migração prematura quanto a tardia:

| Decisão atual | Reavaliar quando |
|---|---|
| Busca no PostgreSQL | >5M documentos por tenant **ou** p95 de busca >400ms |
| Monólito modular | >25 engenheiros **ou** necessidade real de deploy independente |
| Banco compartilhado | Cliente enterprise exigir isolamento físico por contrato |
| REST | Cliente mobile sofrer com over-fetching de forma medida |
| Um provedor de IA | Custo por tenant exceder margem **ou** contrato de privacidade mudar |
| Sem Kubernetes | Mais de ~10 serviços independentes |
| Postgres vertical | Réplica de leitura não resolver a carga de leitura |

---

## 10.6 Princípios de engenharia aplicados

### SOLID — onde aparece concretamente

| Princípio | Aplicação neste projeto |
|---|---|
| **S** — Responsabilidade única | Um use case = uma intenção do usuário. Não existe `CaseService` com 30 métodos |
| **O** — Aberto/fechado | Novo tipo de evento de timeline ou novo provedor de IA entra por implementação, sem alterar quem consome |
| **L** — Substituição de Liskov | Qualquer `AIProvider` é substituível; qualquer `CaseRepository` (Prisma, memória para teste) também |
| **I** — Segregação de interface | Ports pequenos e específicos (`TextExtractor`, `AntivirusScanner`, `EmailSender`) em vez de um `IStorageService` gigante |
| **D** — Inversão de dependência | Use cases dependem de interfaces do domínio; a implementação Prisma é injetada. Domínio não conhece infraestrutura |

### Clean Architecture — com pragmatismo
Quatro camadas, dependência apontando para dentro, domínio isolado de framework.
**Mas:** DTOs não são triplicados por camada sem necessidade, e módulos CRUD
(perfil, notificações) usam caminho direto. Arquitetura limpa aplicada
uniformemente a domínio anêmico produz cerimônia, não qualidade.

### DDD — seletivo
Linguagem ubíqua em português nas entidades (Processo, Prazo, Parte — como o
advogado fala) · agregados com fronteira transacional explícita · value objects
para o que tem regra de validação (CNJ, CPF, valor monetário) · eventos de
domínio para desacoplar efeitos colaterais · contextos delimitados mapeados em
[06](06-modelo-dominio.md) §6.1. Aplicado onde há complexidade real; ver a tabela
de [05](05-arquitetura-backend.md) §5.1.

### Outras práticas
Fail fast (configuração validada com Zod no boot — o app não sobe com env
inválida) · imutabilidade em value objects e resultados · idempotência em jobs e
POSTs sensíveis · degradação funcional (IA fora não derruba o produto) ·
observabilidade como requisito, não como adição posterior · Definition of Done
inclui testes, acessibilidade, auditoria e teste de autorização.

---

## 10.7 Riscos técnicos e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|:--:|:--:|---|
| Custo de IA acima do previsto | Alta | Alto | Cache agressivo, cota por tenant, RAG para reduzir contexto, roteamento por modelo, telemetria de custo desde o dia 1 |
| Qualidade do resumo de IA abaixo do esperado | Média | Alto | Feedback do usuário instrumentado, prompts versionados, avaliação com casos reais no beta, expectativa calibrada na copy |
| Vazamento entre tenants | Baixa | **Crítico** | Tripla defesa, teste automatizado de isolamento, pentest |
| OCR ruim em documento escaneado | Alta | Médio | Fallback de engine, aviso de qualidade ao usuário, permitir correção manual do texto |
| Adoção baixa por resistência a mudança | Média | Alto | Onboarding guiado, importação de dados, foco na Camila (influenciadora interna) |
| Performance da busca degradar com volume | Média | Alto | Orçamento de latência monitorado, gatilho de migração definido |
| Complexidade do RBAC virar suporte | Média | Médio | Papéis padrão cobrindo 90% dos casos, simulador de permissão no admin |
| Escopo do MVP inflar | **Alta** | Alto | Lista de "fora do MVP" explícita em [01](01-visao-produto.md) §1.5 e anti-persona em [02](02-personas.md) §2.8 |

---

## 10.8 Definition of Done

Uma funcionalidade está pronta quando:

- [ ] Regras de negócio implementadas e cobertas por teste
- [ ] Testes: unitário + integração; E2E se for jornada crítica
- [ ] Autorização implementada **e testada** (caso de acesso negado incluído)
- [ ] Eventos de auditoria emitidos onde aplicável
- [ ] Cinco estados de tela implementados (§3.11)
- [ ] Dark e light mode verificados
- [ ] Acessibilidade: teclado, leitor de tela, contraste, axe sem violação crítica
- [ ] Responsivo em mobile, tablet e desktop
- [ ] Contrato OpenAPI atualizado e tipos regerados
- [ ] Observabilidade: logs, métricas e trace relevantes
- [ ] Documentação atualizada (ADR se houve decisão arquitetural)
- [ ] Revisão por par aprovada
- [ ] Orçamento de performance respeitado

---

**Anterior:** [09-seguranca-lgpd.md](09-seguranca-lgpd.md) · **Resumo:** [00-resumo-executivo.md](00-resumo-executivo.md)
