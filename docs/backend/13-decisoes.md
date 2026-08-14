# 13 — Decisões, Conflitos e Riscos desta Etapa

## 13.1 Conflito identificado: granularidade de módulo NestJS vs. módulo de domínio

**Conflito:** o prompt lista `Deadlines` e `Folders` como módulos próprios,
enquanto os módulos de domínio já oficiais em
[../database/00-resumo-modelagem.md §0.4](../database/00-resumo-modelagem.md)
tratam `Prazo` como parte de `LegalCases` e `Pasta` como parte de
`Documents`.

**Impacto:** nenhum em nível de domínio, dados ou API — `Prazo` e `Pasta`
continuam sendo as mesmas entidades, com as mesmas regras, endpoints e
tabelas já especificados. O único efeito é **puramente de organização de
código**: onde o arquivo `.controller.ts`/`.module.ts` mora no NestJS.

**Resolução aplicada (menor alteração possível):** módulos NestJS `Deadlines`
e `Folders` **próprios**, com dependência declarada explicitamente sobre
`LegalCases`/`Documents` (ver [04-dependencias.md §4.1](04-dependencias.md)) —
não fundidos dentro do módulo pai. Justificativa: `Prazo` e `Pasta` têm rotas
HTTP e regras de ciclo de vida (hierarquia com prevenção de ciclo, cancelamento
com justificativa) suficientemente distintas para justificar um Controller e
um `.module.ts` próprios, mesmo pertencendo ao mesmo bounded context
conceitual do domínio. Isso **não contradiz** nada de
[../database/00-resumo-modelagem.md](../database/00-resumo-modelagem.md) —
apenas usa uma granularidade de código ligeiramente mais fina que a de
domínio, prática comum e sem custo (o grafo de dependência já registra a
relação de subordinação, então a fronteira modular do domínio continua
respeitada logicamente).

## 13.2 Nenhum outro conflito

Revisão cruzada contra [../05-arquitetura-backend.md](../05-arquitetura-backend.md),
[../database/](../database/00-resumo-modelagem.md) e
[../api/](../api/00-resumo.md) não encontrou nenhuma outra divergência. Esta
etapa é aditiva: projeta a organização de código para implementar decisões
já tomadas, sem alterar nenhuma.

## 13.3 Decisões desta etapa sem correspondente explícito anterior

| Decisão | Racional |
|---|---|
| `Result<T>` em vez de exceção para fluxo de controle esperado | Erro de negócio (CNJ duplicado, versão desatualizada) não é uma condição "excepcional" do ponto de vista do sistema — é um resultado esperado do domínio; `throw` fica reservado a falha real de infraestrutura |
| `dependency-cruiser` como enforcement automatizado do grafo de módulos | Documentação de dependência sem verificação por máquina tende a divergir do código real com o tempo |
| Outbox com worker próprio (`OutboxPublisherWorker`) | Implementação concreta do padrão já anunciado em [../database/12-eventos-fluxos-regras.md §12.1](../database/12-eventos-fluxos-regras.md) — aqui, o mecanismo de entrega ganha um dono explícito |
| Dredd/schemathesis para contract testing | Ferramentas maduras que validam request, response e status HTTP contra o OpenAPI gerado, com geração automática de casos de fronteira via property-based testing |
| MinIO + Mailhog no Docker Compose de desenvolvimento | Permite que `S3Adapter`/`SmtpAdapter` reais (não fakes) sejam exercitados localmente sem depender de credencial de nuvem |

## 13.4 Riscos desta etapa

| Risco | Mitigação |
|---|---|
| Módulo `Shared` virar "gaveta de tudo" à medida que crescem os adapters (mail, storage, ai, cache) | Cada adapter tem sua própria pasta com port/adapter isolado; revisão de PR rejeita adição de regra de negócio dentro de `shared/infrastructure/*` |
| Contract testing com geração automática de casos pode gerar falso positivo em campo com validação semântica complexa (ex.: CNJ) | Casos gerados automaticamente cobrem forma; validação semântica (dígito verificador) permanece coberta por teste unitário explícito do Value Object, não pelo contract test |
| `dependency-cruiser` com regras desatualizadas conforme módulos evoluem | Regras revisadas no mesmo PR que adiciona/remove dependência entre módulos — não é configuração "escreva uma vez e esqueça" |

## 13.5 Pendências explícitas para a implementação (Prompt 5B)

1. Escolha final de ferramenta de contract testing entre Dredd e
   schemathesis (ambas atendem o requisito; decisão fica para quando o time
   avaliar ergonomia de configuração no projeto real).
2. Definição do provedor de Secret Manager conforme a nuvem escolhida em
   [../10-roadmap-e-decisoes.md §10.1](../10-roadmap-e-decisoes.md) (AWS
   Secrets Manager vs. Vault) — arquitetura já assume a existência de um,
   não prescreve qual.
3. Escrita do `schema.prisma` real (fora do escopo de todas as etapas de
   documentação até aqui) e das migrations executáveis correspondentes.
4. Implementação de fato dos Controllers/Services/Use Cases — este
   documento projeta a estrutura, não o conteúdo de cada arquivo.

---

**Anterior:** [12-docker.md](12-docker.md) · **Próximo:** [14-contexto-proxima-etapa.md](14-contexto-proxima-etapa.md)
