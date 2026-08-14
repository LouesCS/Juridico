# 00 — Resumo da Especificação de UX/UI (Fase 1)

> **Escopo:** especificação completa de experiência do usuário do Quilombo Dev
> — princípios, personas, jornadas, navegação, telas, design system, biblioteca
> de componentes, UX writing, acessibilidade, responsividade, wireframes e
> checklists — em nível de detalhe suficiente para um designer construir 100%
> do projeto no Figma e um desenvolvedor implementar sem decisões de UX em aberto.
>
> **Esta pasta eleva para o nível de experiência** o que já estava decidido em
> [`../01-visao-produto.md`](../01-visao-produto.md),
> [`../02-personas.md`](../02-personas.md),
> [`../03-fluxos-e-telas.md`](../03-fluxos-e-telas.md),
> [`../07-design-system.md`](../07-design-system.md) e
> [`../08-especificacao-modulos.md`](../08-especificacao-modulos.md), e é
> consistente com as entidades e regras de
> [`../database/`](../database/00-resumo-modelagem.md). **Não redefine
> arquitetura, banco de dados, entidades ou permissões.**
>
> **O que esta pasta NÃO faz:** não gera código, componentes React, HTML ou
> CSS · não altera nenhuma decisão de arquitetura, banco ou permissão já
> tomada · não adiciona funcionalidade fora do MVP sem marcá-la explicitamente
> como preparação futura.

---

## 0.1 Como ler esta pasta

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | [00-resumo.md](00-resumo.md) | Este documento |
| 01 | [01-design-principles.md](01-design-principles.md) | Filosofia do produto e princípios de UX, com impacto por tela |
| 02 | [02-personas.md](02-personas.md) | Owner, Administrador, Sócio, Advogado, Assistente, Estagiário — objetivos, dores, jornadas |
| 03 | [03-user-journeys.md](03-user-journeys.md) | 12 jornadas ponta a ponta em Mermaid |
| 04 | [04-navigation.md](04-navigation.md) | Árvore de navegação completa — telas, modais, drawers, menus |
| 05 | [05-dashboard.md](05-dashboard.md) | Especificação completa do Dashboard |
| 06 | [06-processos.md](06-processos.md) | Especificação completa da Tela do Processo |
| 07 | [07-documentos.md](07-documentos.md) | Especificação completa da Tela de Documentos |
| 08 | [08-clientes.md](08-clientes.md) | Especificação completa da Tela de Clientes |
| 09 | [09-busca-global.md](09-busca-global.md) | Busca Global — a funcionalidade mais importante do produto |
| 10 | [10-perfil.md](10-perfil.md) | Perfil, preferências, segurança |
| 11 | [11-notificacoes.md](11-notificacoes.md) | Central de notificações |
| 12 | [12-design-system.md](12-design-system.md) | Tipografia, grid, spacing, elevação, motion, tokens |
| 13 | [13-componentes.md](13-componentes.md) | Catálogo completo de ~35 componentes |
| 14 | [14-ux-writing.md](14-ux-writing.md) | Tom de voz e padrões de mensagem |
| 15 | [15-acessibilidade.md](15-acessibilidade.md) | WCAG AA, ARIA, teclado, screen reader |
| 16 | [16-wireframes.md](16-wireframes.md) | Wireframes ASCII de todas as telas principais |
| 17 | [17-responsividade.md](17-responsividade.md) | Adaptação desktop/notebook/tablet/mobile |
| 18 | [18-checklists.md](18-checklists.md) | Checklists de UX, UI, Design System, Acessibilidade, Dev, QA |
| 19 | [19-decisoes.md](19-decisoes.md) | Conflitos identificados, decisões e riscos desta etapa |
| 20 | [20-contexto-proxima-etapa.md](20-contexto-proxima-etapa.md) | Contexto oficial para o Prompt 4 (Especificação de API) |

## 0.2 Filosofia do produto (premissa de tudo que segue)

O Quilombo Dev **não é um ERP jurídico** — é um **Workspace**. Essa distinção
não é retórica: ela determina como cada tela é julgada.

| Premissa | O que ela proíbe | O que ela exige |
|---|---|---|
| O usuário trabalha, não preenche sistema | Formulários longos como caminho único | Cadastro incompleto é estado válido; captura rápida, completude depois |
| A busca é o centro da experiência | Busca como funcionalidade secundária num canto | ⌘K acessível de qualquer tela, sempre, sem exceção |
| O processo é o contexto principal | Navegação que obriga sair do processo para consultar algo relacionado | Documentos, prazos, comentários e IA vivem *dentro* do processo, nunca em telas desconectadas |
| A IA é copiloto | IA como oráculo de resposta final | Toda saída de IA é sugestão citada e conferível, nunca afirmação isolada |
| A interface deve desaparecer | Excesso de cromo visual, decoração, telas de configuração no caminho | Cada tela expõe o mínimo necessário para a tarefa em curso |
| O usuário sempre sabe a próxima ação | Telas com múltiplas ações de mesmo peso visual | Uma ação primária clara por tela, sempre |

Detalhado tela a tela em [01-design-principles.md](01-design-principles.md).

## 0.3 O que já estava decidido e o que esta etapa adiciona

| Já decidido (arquitetura oficial) | Adicionado nesta etapa |
|---|---|
| Paleta, tipografia, escala de espaçamento, dark/light ([07-design-system.md](../07-design-system.md)) | Grid detalhado, motion completo, ilustrações, estados de feedback consolidados |
| Árvore de telas e fluxos de alto nível ([03-fluxos-e-telas.md](../03-fluxos-e-telas.md)) | Wireframes tela a tela, mapa de navegação com modais/drawers, jornadas emocionais |
| ~25 componentes catalogados ([07-design-system.md §7.6](../07-design-system.md)) | ~35 componentes com objetivo, quando (não) usar, estados, variantes, acessibilidade |
| Regras funcionais por módulo ([08-especificacao-modulos.md](../08-especificacao-modulos.md)) | Critérios de aceite de UX, estados de erro/vazio específicos, UX writing completo |
| Entidades e permissões ([docs/database](../database/00-resumo-modelagem.md)) | Como cada permissão se traduz em elemento visível/oculto/desabilitado na tela |

## 0.4 Personas desta etapa

Owner, Administrador, Sócio, Advogado, Assistente, Estagiário — mapeadas às
personas originais de [02-personas.md](../02-personas.md) em
[02-personas.md](02-personas.md) desta pasta, com uma nota de reconciliação
sobre o papel Owner (ver §2.1).

## 0.5 Critério de conclusão desta etapa

Um desenvolvedor deve conseguir abrir qualquer arquivo desta pasta e implementar
a tela correspondente sem perguntar "o que acontece quando..." — todo estado
(carregando, vazio, erro, sem permissão), toda mensagem e todo componente usado
está especificado em algum lugar navegável a partir deste índice.

---

**Próximo:** [01-design-principles.md](01-design-principles.md)
