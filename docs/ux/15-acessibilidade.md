# 15 — Acessibilidade

> Reafirma e detalha [../07-design-system.md §7.9](../07-design-system.md) e
> a suíte de testes de [../04-arquitetura-frontend.md §4.10](../04-arquitetura-frontend.md).
> **WCAG 2.1 AA é o piso**, não a meta — nenhuma tela é considerada pronta sem
> passar nos itens abaixo.

## 15.1 Contraste

| Elemento | Razão mínima |
|---|---|
| Texto normal (<18px) sobre fundo | 4.5:1 |
| Texto grande (≥18px ou ≥14px bold) | 3:1 |
| Componentes de interface (borda de input, ícone funcional) | 3:1 |
| Estados de foco (anel) | 3:1 contra o fundo adjacente |

Verificado nos dois temas (claro/escuro) — reafirma
[../07-design-system.md §7.2](../07-design-system.md). Nenhuma cor semântica
(`success`/`warning`/`danger`/`info`/`ai`) é usada como único portador de
informação — sempre acompanhada de ícone ou texto (ex.: badge de status tem
ponto colorido **e** rótulo textual).

## 15.2 ARIA

| Componente | Atributos obrigatórios |
|---|---|
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apontando ao título |
| Toast | `aria-live="polite"` (sucesso) / `aria-live="assertive"` (erro) |
| Command Palette | `role="combobox"` + `aria-expanded` + `role="listbox"` nos resultados |
| Tabs | `role="tablist"`, `role="tab"` com `aria-selected`, `role="tabpanel"` |
| Breadcrumb | `nav aria-label="breadcrumb"`, último item com `aria-current="page"` |
| Campo com erro | `aria-invalid="true"` + `aria-describedby` apontando à mensagem de erro |
| Botão só-ícone | `aria-label` descritivo da ação, nunca do ícone ("Excluir documento", não "Ícone de lixeira") |
| Data Grid | `aria-sort` no cabeçalho ordenável, `aria-rowcount`/`aria-colcount` em tabelas virtualizadas |
| Progress (upload) | `role="progressbar"` com `aria-valuenow/min/max` |

## 15.3 Teclado

Todo elemento interativo é alcançável e operável via `Tab`/`Shift+Tab`, sem
armadilha de foco fora de overlays intencionais (modal). Ordem de tab segue a
ordem visual/lógica da tela, nunca a ordem do DOM se ela divergir visualmente.
Mapa completo de atalhos em [04-navigation.md §4.9](04-navigation.md).

**Nenhuma funcionalidade depende exclusivamente de mouse/hover:** tooltip
também aparece em `focus`; drag-and-drop de upload e de documento-para-pasta
sempre tem alternativa por clique/menu ("Mover para pasta..." no menu "⋮").

## 15.4 Foco

- `focus-visible` com anel de 2px + offset de 2px em **todo** elemento
  interativo, cor de marca, reafirma
  [../07-design-system.md §7.9](../07-design-system.md).
- Ao abrir modal/drawer, foco move para o primeiro elemento focável relevante
  (geralmente o título ou o primeiro campo); ao fechar, foco retorna ao
  elemento que originou a abertura.
- Skip link "Ir para o conteúdo" como primeiro elemento tabulável de toda
  página autenticada, antes da Sidebar.

## 15.5 Screen Reader

- Toda imagem/ilustração decorativa tem `alt=""` (ignorada pelo leitor);
  ícone funcional sem texto visível tem `aria-label`.
- Mudanças de estado assíncronas relevantes (upload concluído, resumo de IA
  pronto) são anunciadas via região `aria-live="polite"` — o usuário de
  leitor de tela não precisa navegar de volta à área para descobrir que algo
  mudou.
- Streaming de texto de IA usa `aria-live="polite"` no container, mas com
  debounce de anúncio (não anuncia cada token — anuncia ao final do
  streaming, para não gerar leitura fragmentada palavra a palavra).
- Tabelas de dados (`Data Grid`) usam `<th scope="col">` reais, nunca `<div>`
  estilizado como cabeçalho sem semântica.

## 15.6 Atalhos e conflito com tecnologia assistiva

Atalhos de uma tecla só (`G`, `N`, `/`) seguem o padrão de "sequência" (G então
D) em vez de tecla única isolada onde possível, para reduzir conflito com
leitores de tela que usam teclas de navegação de letra única. Atalho `⌘K`/
`Ctrl+K` é o único de tecla-modificadora + letra, convenção já familiar e sem
conflito comum com AT.

## 15.7 Tamanho mínimo dos componentes

| Contexto | Mínimo |
|---|---|
| Alvo de toque (mobile) | 44×44px |
| Alvo de clique (desktop) | 36×36px (botão `sm`), reafirma [../07-design-system.md §7.8](../07-design-system.md) |
| Espaçamento entre alvos adjacentes | ≥8px, para evitar toque acidental em mobile |
| Fonte mínima em qualquer tela | 12px (`caption`), nunca menor |

## 15.8 Verificação contínua

`axe-core` no CI, zero violação crítica bloqueia merge (reafirma
[../04-arquitetura-frontend.md §4.10](../04-arquitetura-frontend.md)). Toda
tela nova documentada nesta pasta (05 a 11) inclui a checagem de
acessibilidade como parte do critério de aceite antes de ser considerada
"pronta para dev".

---

**Anterior:** [14-ux-writing.md](14-ux-writing.md) · **Próximo:** [16-wireframes.md](16-wireframes.md)
