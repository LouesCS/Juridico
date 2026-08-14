# 13 — Catálogo de Componentes

> Base primitiva em shadcn/ui + Radix, reafirma
> [../07-design-system.md §7.6](../07-design-system.md) e
> [../04-arquitetura-frontend.md §4.6](../04-arquitetura-frontend.md). Aqui:
> especificação de uso de cada componente do ponto de vista de UX — objetivo,
> quando (não) usar, estados, variantes e acessibilidade.

---

## 13.1 Primitivos de formulário

### Button
- **Objetivo:** disparar uma ação.
- **Quando usar:** toda ação clicável que não é navegação de texto simples.
- **Quando NÃO usar:** navegação entre páginas sem efeito colateral (use link/`Tabs`).
- **Estados:** rest, hover, active, focus-visible, disabled, loading.
- **Variantes:** `default` (marca, ação primária) · `secondary` · `outline` ·
  `ghost` · `destructive` · `link` · `ai` (violeta, exclusivo de ação de IA).
- **Acessibilidade:** alvo mínimo 36×36px (44×44 em mobile); `aria-busy` durante loading; nunca só ícone sem `aria-label`.

### Input
- **Objetivo:** entrada de texto curto de uma linha.
- **Quando usar:** nome, e-mail, número, busca de campo único.
- **Quando NÃO usar:** texto longo (use `Textarea`); seleção de opção fixa (use `Select`).
- **Estados:** rest, focus, error (`aria-invalid` + mensagem via `aria-describedby`), disabled, com prefixo/sufixo.
- **Variantes:** texto, número, senha (com toggle de visibilidade), busca (com ícone e botão de limpar).
- **Acessibilidade:** rótulo real sempre associado (`<label for>`), nunca só `placeholder`.

### Textarea
- **Objetivo:** texto longo (descrição, observações, comentário).
- **Quando usar:** campo que pode exceder 1 linha.
- **Quando NÃO usar:** campo curto (usar `Input` — `Textarea` sugere volume de texto que não existe).
- **Estados:** iguais ao `Input`, mais auto-resize opcional.
- **Variantes:** com contador de caracteres (quando há limite de negócio).

### Select
- **Objetivo:** escolher uma opção de um conjunto fechado e conhecido.
- **Quando usar:** status, tipo, papel — poucas opções (<15).
- **Quando NÃO usar:** conjunto grande ou que precisa de busca (usar `Combobox`/autocomplete, ex.: seleção de cliente).
- **Estados:** rest, aberto, selecionado, disabled.
- **Acessibilidade:** navegável por teclado (setas + digitação para pular a opção), `aria-expanded`.

### Checkbox
- **Objetivo:** escolha booleana independente (pode haver várias marcadas).
- **Quando usar:** seleção múltipla em lista, aceite de termo.
- **Quando NÃO usar:** escolha única exclusiva (usar `RadioGroup`); toggle imediato de configuração (usar `Switch`).
- **Estados:** desmarcado, marcado, indeterminado (seleção parcial em lista), disabled.

### Switch
- **Objetivo:** ligar/desligar uma configuração com efeito imediato.
- **Quando usar:** preferências (tema, notificação por canal) — muda o sistema no ato do clique, sem "Salvar".
- **Quando NÃO usar:** dentro de um formulário que só aplica ao clicar em "Salvar" (usar `Checkbox` para deixar clara a natureza de rascunho).
- **Estados:** ligado, desligado, disabled, carregando (breve, durante persistência otimista).

---

## 13.2 Overlays

### Modal (Dialog)
- **Objetivo:** tarefa focada que bloqueia interação com o fundo.
- **Quando usar:** cadastro rápido, confirmação, formulário curto.
- **Quando NÃO usar:** conteúdo que se beneficia de contexto do fundo visível (usar `Drawer`); navegação de página inteira.
- **Estados:** abrindo, aberto, fechando.
- **Acessibilidade:** foco preso dentro do modal, `Esc` fecha, foco retorna ao elemento que abriu, `role="dialog"` + `aria-modal`.

### Drawer
- **Objetivo:** painel lateral que mantém parte do contexto de fundo visível.
- **Quando usar:** notificações, filtros avançados, preview rápido, resumo de IA.
- **Quando NÃO usar:** confirmação de ação destrutiva (usar `Modal` — drawer é interrompível demais para isso).
- **Estados:** iguais ao Modal.

### Toast
- **Objetivo:** feedback transitório de baixa fricção.
- **Quando usar:** confirmação de ação sem necessidade de navegação.
- **Quando NÃO usar:** erro que exige ação do usuário (usar estado inline); informação que precisa persistir na tela.
- **Estados:** entrando, visível, saindo. Empilhável até 3.
- **Acessibilidade:** `aria-live="polite"`, não rouba foco.

### Popover
- **Objetivo:** conteúdo contextual ancorado a um elemento, não modal.
- **Quando usar:** seletor de tag, autocomplete de menção, detalhe rápido ao passar o mouse/clicar em ícone de info.
- **Quando NÃO usar:** ação com múltiplos campos (usar `Modal`).

### Dropdown (Menu)
- **Objetivo:** lista de ações ou opções ancorada a um gatilho (botão/ícone).
- **Quando usar:** menu "⋮" de ações de linha, menu do usuário.
- **Acessibilidade:** navegável por setas, `Enter` ativa, `Esc` fecha.

### Tooltip
- **Objetivo:** explicação curta de um ícone ou termo, sob hover/foco.
- **Quando usar:** ícone sem texto, abreviação, motivo de estado desabilitado.
- **Quando NÃO usar:** informação essencial para completar a tarefa (não deve depender de hover — mobile não tem hover).

---

## 13.3 Estrutura e navegação

### Accordion
- **Objetivo:** seções colapsáveis de conteúdo relacionado.
- **Quando usar:** FAQ, campos avançados opcionais em formulário longo.
- **Quando NÃO usar:** conteúdo que o usuário sempre precisa ver (accordion esconde por padrão).

### Tabs
- **Objetivo:** alternar entre vistas do mesmo objeto, sem navegar para outra página logicamente.
- **Quando usar:** abas da Tela do Processo (Visão Geral, Timeline, Documentos...).
- **Acessibilidade:** `role="tablist"`, navegação por setas horizontais, `aria-selected`.

### Sidebar
- **Objetivo:** navegação principal persistente.
- **Estados:** expandida, colapsada (ícones), oculta (mobile, vira `Sheet`).
- **Variantes:** item ativo destacado com fundo `accent` + borda esquerda `primary`.

### Navbar (Topbar)
- **Objetivo:** acesso persistente a busca, notificações, usuário, escritório ativo.
- **Quando NÃO usar variação:** nunca ocultar a busca daqui, em nenhuma tela.

### Breadcrumb
- **Objetivo:** orientação de profundidade de navegação.
- **Quando usar:** qualquer tela a mais de 1 nível da navegação principal.
- **Acessibilidade:** `nav aria-label="breadcrumb"`, último item sem link (`aria-current="page"`).

### Pagination
- **Objetivo:** navegar por um conjunto de resultados grande demais para uma tela.
- **Quando usar:** apenas em telas administrativas de baixo volume (papéis customizados).
- **Quando NÃO usar:** listas de volume (processos, documentos) — usar scroll infinito com cursor, reafirma [../database/02-convencoes-dados.md §2.15](../database/02-convencoes-dados.md).

### Search (campo de busca de página, distinto da Busca Global)
- **Objetivo:** filtrar a lista já carregada na tela atual.
- **Quando NÃO usar:** para buscar fora do escopo da tela atual (isso é Busca Global, `⌘K`).

### Command Palette
- **Objetivo:** busca global + execução de ações via teclado.
- **Quando usar:** especificação completa em [09-busca-global.md](09-busca-global.md).
- **Acessibilidade:** `role="combobox"` + `listbox`, totalmente operável por teclado.

---

## 13.4 Exibição de dados

### Avatar
- **Objetivo:** representar visualmente uma pessoa.
- **Variantes:** foto, iniciais (fallback), tamanhos `xs` a `xl`.
- **Estados:** com indicador de presença (opcional, não usado no MVP).

### Badge
- **Objetivo:** rótulo curto de status ou categoria, não interativo.
- **Quando usar:** status de processo, status de documento.
- **Quando NÃO usar:** quando precisa ser clicável (nesse caso é `Tag` ou `Button` pequeno).
- **Acessibilidade:** cor nunca é o único sinal — sempre acompanhada de texto/ícone.

### Tag
- **Objetivo:** etiqueta reutilizável e removível, associada por usuário.
- **Quando usar:** classificação livre de processo/documento/cliente.
- **Diferença de Badge:** Tag é interativa (removível, clicável para filtrar); Badge é somente leitura.

### Card
- **Objetivo:** agrupar conteúdo relacionado com fronteira visual leve.
- **Quando usar:** blocos do Dashboard, item de grid de documentos/processos.
- **Quando NÃO usar:** lista densa de muitos itens simples (nesse caso, `Table`).

### Table
- **Objetivo:** dados tabulares comparáveis coluna a coluna.
- **Quando usar:** lista de Clientes, lista de usuários no Admin.
- **Quando NÃO usar:** mais de 8 colunas relevantes simultâneas (reafirma princípio 6 de [01-design-principles.md](01-design-principles.md)) — reduzir colunas ou usar Data Grid com colunas configuráveis.

### Data Grid
- **Objetivo:** tabela de alto volume com ordenação, seleção em lote, colunas configuráveis, virtualização.
- **Quando usar:** lista de Processos, lista de Documentos.
- **Estados:** carregando (skeleton com número real de colunas), vazio, com seleção ativa (barra de ações em lote aparece).
- **Acessibilidade:** navegável por teclado entre células, cabeçalho com `aria-sort`.

### Timeline
- **Objetivo:** exibir eventos em ordem cronológica.
- **Quando usar:** aba Timeline do Processo (ver [06-processos.md §6.3](06-processos.md)).
- **Variantes:** compacta (Dashboard, "Atividade Recente"), expandida (aba Timeline completa).

### Notification Card
- **Objetivo:** item de notificação na central.
- **Estados:** lida, não lida, com ação pendente.

### Process Card
- **Objetivo:** representação compacta de um processo em grid/lista.
- **Conteúdo:** título, cliente, status (badge), próximo prazo (com semáforo), responsável (avatar).
- **Quando usar:** Dashboard ("Meus Processos"), resultado de busca.

### Client Card
- **Objetivo:** representação compacta de um cliente.
- **Conteúdo:** nome, tipo (PF/PJ), nº de processos ativos, responsável.

### Document Card
- **Objetivo:** representação compacta de um documento.
- **Conteúdo:** ícone por tipo de arquivo, nome, tamanho, data, badge de versão se >1.
- **Estados:** enviando (com progresso), processando, pronto, erro, infectado (bloqueado).

### Comment
- **Objetivo:** exibir um comentário em thread.
- **Conteúdo:** avatar do autor, nome, tempo relativo, conteúdo, indicador "editado", ações (responder, editar, excluir — condicionadas a autoria/permissão).

### Upload (Dropzone)
- **Objetivo:** capturar arquivo(s) por arrastar-soltar ou seleção.
- **Estados:** vazio (convite), arrastando sobre (destaque), enviando (progresso por arquivo), erro por arquivo.
- **Acessibilidade:** também operável via clique + seletor de arquivo nativo — drag-and-drop nunca é o único caminho.

### AI Summary Card
- **Objetivo:** exibir saída de IA com todos os requisitos de confiança.
- **Elementos obrigatórios:** selo "Gerado por IA", data de geração, conteúdo (streaming), fontes citadas clicáveis, feedback 👍/👎, botão atualizar.
- **Quando usar:** exclusivamente dentro do contexto do processo/documento a que se refere — nunca solto no Dashboard sem contexto.
- **Estados:** vazio (convite a gerar), gerando (streaming), pronto, erro, desatualizado (fonte mudou desde a geração).

---

## 13.5 Feedback

### ConfirmDialog
- **Objetivo:** confirmar ação antes de executá-la.
- **Variantes:** normal (ação reversível — botão `outline`) · perigosa (ação destrutiva — exige digitar o nome da entidade, botão `destructive`).
- **Quando NÃO usar:** ações de baixíssimo risco (marcar notificação como lida) — confirmar aqui seria fricção sem benefício.

### EmptyState
- **Objetivo:** comunicar ausência de conteúdo com clareza e próximo passo.
- **Variantes obrigatórias:** primeiro-uso, sem-resultado-de-filtro, erro, sem-permissão — reafirma [../03-fluxos-e-telas.md §3.11](../03-fluxos-e-telas.md).

### Skeleton
- **Objetivo:** indicar carregamento preservando o layout final.
- **Quando usar:** qualquer carregamento >300ms.
- **Quando NÃO usar:** operações muito rápidas (<300ms, ex.: busca global — usar indicador discreto em vez disso, reafirma [09-busca-global.md §9.13](09-busca-global.md)).

---

**Anterior:** [12-design-system.md](12-design-system.md) · **Próximo:** [14-ux-writing.md](14-ux-writing.md)
