# 12 — Design System (Complemento de UX)

> **Este documento não redefine** paleta, tipografia, escala de espaçamento,
> raios ou modo escuro/claro — todos já oficiais em
> [../07-design-system.md](../07-design-system.md). Aqui: grid de layout,
> sombras, ilustrações, estados de feedback consolidados e motion aplicado a
> transição de tela — a camada que falta entre "tokens" e "tela pronta".

## 12.1 Tipografia — referência rápida (sem alteração)

Ver [../07-design-system.md §7.3](../07-design-system.md) — Inter (interface),
Source Serif 4 (leitura longa), JetBrains Mono (números processuais). Escala
de `display` a `caption` inalterada.

## 12.2 Grid de layout

| Contexto | Colunas | Gutter | Margem lateral |
|---|---|---|---|
| Desktop ≥1280px | 12 colunas | 24px | 24px |
| Laptop 1024–1279 | 12 colunas | 20px | 20px |
| Tablet 768–1023 | 8 colunas | 16px | 16px |
| Mobile <768 | 4 colunas | 12px | 16px |

Regras de composição: Dashboard usa 2 blocos de 6 colunas cada em desktop;
Tela do Processo usa conteúdo principal de 8 colunas + painel lateral de 4;
formulários nunca ultrapassam 8 colunas de largura (linha de texto/campo mais
longa que isso prejudica leitura, reafirma
[../07-design-system.md §7.3](../07-design-system.md), 75 caracteres por linha).

## 12.3 Spacing, Radius — referência (sem alteração)

Ver [../07-design-system.md §7.4](../07-design-system.md) (escala de 4px) e
[§7.5](../07-design-system.md) (raios `sm/md/lg/xl/full`).

## 12.4 Elevação e Sombras

Reafirma 5 níveis de [../07-design-system.md §7.5](../07-design-system.md).
Especificação de sombra (light mode) por nível:

| Nível | `box-shadow` (conceitual) | Uso |
|---|---|---|
| 0 | nenhuma | Fundo de página |
| 1 | `0 1px 2px rgba(0,0,0,.05)` | Card em repouso |
| 2 | `0 2px 8px rgba(0,0,0,.08)` | Card em hover, dropdown |
| 3 | `0 4px 16px rgba(0,0,0,.10)` | Popover, drawer |
| 4 | `0 8px 32px rgba(0,0,0,.14)` | Modal, command palette |

No dark mode, sombra é substituída por diferença de luminosidade de
superfície (reafirma [../07-design-system.md §7.5](../07-design-system.md)) —
sombra pura é quase invisível sobre fundo escuro e não deve ser usada como
único sinal de elevação nesse tema.

## 12.5 Paleta — referência (sem alteração)

Ver [../07-design-system.md §7.2](../07-design-system.md). Reforço de
governança: violeta (`ai`) é **exclusivo** de conteúdo gerado por IA em
qualquer novo componente criado a partir desta especificação — nenhuma
exceção nas telas documentadas nesta pasta.

## 12.6 Dark / Light Mode — referência (sem alteração)

Ver [../07-design-system.md §7.2](../07-design-system.md). Todo wireframe
desta pasta ([16-wireframes.md](16-wireframes.md)) é neutro de tema — aplica-se
igualmente a claro e escuro via tokens semânticos, nunca cor bruta.

## 12.7 Tokens — referência (sem alteração)

Ver lista completa em [../07-design-system.md §7.2](../07-design-system.md).

## 12.8 Motion e Transições (expandido)

Durações e easings reafirmam [../07-design-system.md §7.7](../07-design-system.md).
Complemento específico de transição de tela/rota:

| Transição | Comportamento |
|---|---|
| Navegação entre rotas do mesmo nível (ex.: Processos → Documentos) | Fade simples de conteúdo, 150ms — sem slide, para não sugerir hierarquia que não existe |
| Entrar em detalhe (lista → item) | Leve slide-in de 8px + fade, 200ms — sugere "aprofundar" |
| Sair de detalhe (voltar) | Reverso do acima |
| Abrir drawer | Slide da borda (direita), 200ms, com backdrop fade simultâneo |
| Abrir modal | Fade + scale de 98%→100%, 200ms |
| Streaming de texto de IA | Sem transição de entrada por palavra (apareceria "picotado") — cursor pulsante contínuo (`animation: blink 1s step-end infinite`) |
| Skeleton → conteúdo real | Cross-fade de 150ms, nunca troca abrupta |

`prefers-reduced-motion` desativa todos os itens acima exceto o cross-fade de
150ms de skeleton→conteúdo (reduzido para instantâneo), reafirma
[../07-design-system.md §7.7](../07-design-system.md).

## 12.9 Ícones — referência (sem alteração)

Lucide React, reafirma [../07-design-system.md §7.6](../07-design-system.md).

## 12.10 Ilustrações

Estilo: linha simples, 2 cores (contorno `foreground` + preenchimento
`accent`/`ai-subtle` conforme contexto), sem gradientes nem estoque
genérico — consistente com o princípio "interface deve desaparecer": uma
ilustração vistosa demais chama mais atenção que a tarefa em si.

| Contexto | Ilustração |
|---|---|
| Dashboard vazio (primeiro uso) | Mesa de trabalho estilizada, minimalista |
| Nenhum resultado de busca | Lupa com interrogação, traço simples |
| Nenhum documento na pasta | Pasta aberta vazia |
| Erro genérico | Documento com "!" — nunca ilustração cômica/robô quebrado, tom sério do domínio jurídico |
| Sem permissão / 404 | Cadeado simples, sem tom alarmante |

## 12.11 Estados e Feedback (consolidado)

| Estado | Padrão visual aplicado em toda tela |
|---|---|
| Carregando | Skeleton com a forma real do conteúdo (nunca spinner de tela cheia, reafirma [17-responsividade.md](17-responsividade.md) e [../04-arquitetura-frontend.md §4.7](../04-arquitetura-frontend.md)) |
| Sucesso transitório | Toast (canto inferior direito, 4s) para ações sem necessidade de navegação |
| Sucesso persistente | Mudança de estado inline (badge, ícone de check) — nunca toast para algo que já é visível na tela |
| Erro recuperável | Mensagem inline + botão "Tentar novamente" + `correlationId` pequeno |
| Erro catastrófico | Tela de erro dedicada (`global-error`), com o mesmo tom sério das ilustrações |
| Vazio (primeiro uso) | Ilustração + título + explicação de 1 frase + CTA primário |
| Vazio (sem resultado de filtro) | Mensagem + "Limpar filtros", sem ilustração (é um estado momentâneo, não merece o mesmo peso visual do vazio de primeiro uso) |

## 12.12 Responsividade — referência

Ver detalhamento completo em [17-responsividade.md](17-responsividade.md);
breakpoints reafirmam [../07-design-system.md §7.4](../07-design-system.md).

---

**Anterior:** [11-notificacoes.md](11-notificacoes.md) · **Próximo:** [13-componentes.md](13-componentes.md)
