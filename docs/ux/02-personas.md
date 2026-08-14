# 02 — Personas (Lente de UX)

> Reconciliação com [../02-personas.md](../02-personas.md) e com os 6 papéis
> ativos de [../database/08-permissoes-seguranca.md §8.1](../database/08-permissoes-seguranca.md).

## 2.1 Nota de reconciliação — Owner

A documentação de produto original não tinha uma persona "Owner" separada:
Ricardo (Sócio-administrador) já acumulava, na prática, a responsabilidade que
o papel `OWNER` formaliza no banco (titularidade do escritório, faturamento,
encerramento de conta). **Não há conflito** — Owner e Sócio são, na imensa
maioria dos escritórios-alvo (pequeno/médio porte), a mesma pessoa em dois
chapéus. Esta etapa documenta as duas óticas separadamente porque a
**interface** precisa expor ações que só o chapéu Owner vê (encerrar
escritório, faturamento, transferir titularidade), mesmo quando o usuário
logado é a mesma Camila... digo, o mesmo Ricardo.

## 2.2 Owner

**Quem:** Ricardo, também na função de titular do escritório perante o SaaS.

| Dimensão | Descrição |
|---|---|
| Objetivos | Continuidade do negócio: garantir que o escritório nunca fique sem acesso, que o plano/faturamento esteja em dia, que a titularidade possa ser transferida se ele se afastar |
| Necessidades | Uma área clara de "conta do escritório" separada da operação do dia a dia |
| Dores | Medo de ficar "trancado para fora" da própria conta; não saber quem mais tem poder de admin |
| Expectativas | Ações de titularidade raras, mas quando precisar, óbvias e sem ambiguidade |
| Frequência de uso (chapéu Owner) | Rara — onboarding, troca de plano, eventual transferência de titularidade |
| Jornadas principais | Criar o escritório · convidar o primeiro Admin · (eventualmente) transferir titularidade · encerrar conta |

**Ação exclusiva na interface:** "Transferir titularidade" e "Encerrar
escritório" só aparecem para `OWNER`, sempre atrás de confirmação com
digitação do nome do escritório (padrão de ação perigosa, ver
[13-componentes.md](13-componentes.md) `ConfirmDialog`).

## 2.3 Administrador (Marcos)

Reafirma [../02-personas.md §2.5](../02-personas.md).

| Dimensão | Descrição |
|---|---|
| Objetivos | Provisionar/desprovisionar acesso rápido; responder auditoria; configurar SSO |
| Necessidades | Área administrativa separada da operação jurídica, com dados de configuração agrupados |
| Dores | Sistemas sem log utilizável; desligamento de funcionário sem revogação imediata |
| Expectativas | Ação de segurança (revogar acesso) em poucos cliques, sem precisar entender o resto do produto |
| Frequência de uso | Esporádica, sessões curtas e objetivas |
| Jornadas principais | Convidar usuário · alterar papel · revogar sessão · consultar auditoria · configurar SSO |

## 2.4 Sócio (Ricardo)

Reafirma [../02-personas.md §2.2](../02-personas.md).

| Dimensão | Descrição |
|---|---|
| Objetivos | Panorama da carteira sem convocar reunião; detectar risco cedo; chegar a reuniões com contexto pronto |
| Necessidades | Dashboard executivo; resumo de IA rápido antes de reunião |
| Dores | "Ninguém me dá panorama, me dão 12 planilhas"; perde tempo relendo processo antes de reunião |
| Expectativas | Responder qualquer pergunta sobre qualquer caso em <2 minutos |
| Frequência de uso | 2–3×/dia, sessões curtas (3–8 min), forte uso mobile/tablet |
| Jornadas principais | Ver Dashboard · abrir resumo de IA · ver carteira por responsável · receber alerta de risco |

## 2.5 Advogado (Camila)

Reafirma [../02-personas.md §2.3](../02-personas.md) — **usuária de maior
volume e maior influência de adoção interna**.

| Dimensão | Descrição |
|---|---|
| Objetivos | Nunca perder prazo; achar a peça certa sem caçar em pasta; reaproveitar teses anteriores |
| Necessidades | Busca global rápida; timeline clara; versionamento de documento confiável |
| Dores | Controle de versão por nome de arquivo; 8 cliques para anexar documento; 4 sistemas para montar contexto de um caso |
| Expectativas | Atalhos de teclado; menos cliques; nunca esperar tela carregar |
| Frequência de uso | Sessões longas (1–3h), múltiplas abas, uso intenso de teclado |
| Jornadas principais | Buscar → abrir processo → ler timeline → anexar documento → comentar → marcar prazo |

## 2.6 Assistente (Sandra)

Reafirma [../02-personas.md §2.4](../02-personas.md).

| Dimensão | Descrição |
|---|---|
| Objetivos | Cadastrar processo/cliente rápido e sem erro; responder cliente ao telefone em tempo real |
| Necessidades | Formulários curtos; autocomplete de cliente; upload em lote |
| Dores | Formulários gigantes com campos que não sabe preencher; cliente na linha e ela sem achar resposta |
| Expectativas | Feedback claro de sucesso/erro; nunca ficar "travada" no meio de um cadastro |
| Frequência de uso | Volume alto de operações repetitivas, o dia todo |
| Jornadas principais | Cadastrar cliente → criar processo → anexar documento → buscar processo por telefone do cliente |

## 2.7 Estagiário (Lucas)

Reafirma [../02-personas.md §2.3](../02-personas.md) (numeração original — persona 3).

| Dimensão | Descrição |
|---|---|
| Objetivos | Entender o caso sozinho e rápido; produzir minuta correta na primeira tentativa |
| Necessidades | Resumo de IA como ferramenta de aprendizado; navegação previsível |
| Dores | Não sabe onde as coisas ficam; medo de perguntar demais; não sabe qual versão é a vigente |
| Expectativas | Estados vazios que ensinam; permissão restritiva que não o deixa "perdido" em dado que não devia ver |
| Frequência de uso | Diária, mas escopo restrito (só processos atribuídos) |
| Jornadas principais | Abrir processo atribuído → ler resumo de IA → ler timeline → fazer upload de peça |

## 2.8 Matriz de frequência × profundidade de uso

| Persona | Frequência | Profundidade (nº de telas distintas/sessão) | Dispositivo dominante |
|---|---|---|---|
| Owner | Rara | Baixa | Desktop/mobile |
| Administrador | Esporádica | Média (área admin) | Desktop |
| Sócio | Alta (curta) | Baixa (Dashboard + resumo) | Mobile/tablet/desktop |
| Advogado | Muito alta (longa) | Alta | Desktop |
| Assistente | Alta (repetitiva) | Média | Desktop |
| Estagiário | Alta | Média (escopo restrito) | Desktop |

Esta matriz orienta prioridade de polimento: **Advogado e Sócio recebem a
maior atenção de performance percebida e atalho de teclado**; Owner e
Administrador recebem a maior atenção de clareza (baixa frequência = baixa
familiaridade a cada uso, a interface precisa se explicar sozinha).

---

**Anterior:** [01-design-principles.md](01-design-principles.md) · **Próximo:** [03-user-journeys.md](03-user-journeys.md)
