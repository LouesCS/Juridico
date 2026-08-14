# 07 — Design System "Quilombo"

> Base: Tailwind CSS 4 + shadcn/ui (Radix). Tokens em CSS custom properties,
> consumidos pelo Tailwind. Um único arquivo de tokens é a fonte da verdade.

---

## 7.1 Princípios de design

1. **Clareza acima de densidade.** Software jurídico tradicional erra por excesso
   de informação simultânea. Mostramos o essencial e revelamos o resto sob demanda.
2. **Hierarquia por espaço e peso, não por cor.** Cor é reservada para significado
   (status, urgência, ação). Interface colorida demais perde poder de sinalização.
3. **Consistência é confiança.** Mesma ação, mesmo lugar, mesmo formato — em todo
   o produto. Advogado precisa confiar na ferramenta como confia no papel timbrado.
4. **Acessibilidade não é opcional.** WCAG 2.1 AA como piso: contraste, foco
   visível, navegação por teclado, leitor de tela.
5. **Sóbrio, não corporativo genérico.** Sério o bastante para o contexto jurídico,
   moderno o bastante para não parecer software de 2008.

---

## 7.2 Cores

### Escala de marca

| Token | Uso |
|---|---|
| `brand-50 … brand-950` | Azul-petróleo profundo — confiança, sobriedade, sem clichê de "azul corporativo" |
| Referência de matiz | `hsl(197, 62%, X%)` — 50 muito claro → 950 quase preto |

O tom de marca aparece em: ação primária, item ativo de navegação, foco, links e
elementos de destaque. **Nunca** como fundo de área grande.

### Neutros
Escala `neutral-0 … neutral-1000` com leve viés frio (matiz ~215, saturação 15–20%
nos tons médios). Cinza puro deixa a interface morta; viés frio combina com a marca.

### Cores semânticas

| Semântica | Significado no produto |
|---|---|
| `success` (verde) | Concluído, salvo, prazo cumprido |
| `warning` (âmbar) | Prazo próximo (≤7 dias), atenção, processamento pendente |
| `danger` (vermelho) | Prazo crítico (≤2 dias), erro, exclusão, prazo perdido |
| `info` (azul) | Informação neutra, dica, estado do sistema |
| `ai` (violeta) | **Exclusivo de conteúdo gerado por IA** |

> **Regra forte:** a cor `ai` (violeta) é reservada. Nenhum elemento não-IA usa
> essa família. Isso torna a origem do conteúdo reconhecível instantaneamente —
> requisito de confiança, não de estética.

### Tokens semânticos (o que os componentes consomem)

Componentes **nunca** referenciam cor bruta (`brand-600`). Consomem papéis:

```
--background            --foreground
--card                  --card-foreground
--popover                --popover-foreground
--primary               --primary-foreground
--secondary             --secondary-foreground
--muted                 --muted-foreground
--accent                --accent-foreground
--destructive           --destructive-foreground
--success / --warning / --info / --ai   (+ -foreground e -subtle de cada)
--border  --input  --ring
--sidebar-* (background, foreground, accent, border)
```

Essa indireção é o que faz dark mode, temas por escritório e ajuste de contraste
funcionarem sem tocar em nenhum componente.

### Dark / Light mode

- Estratégia: classe `.dark` no `<html>`, `next-themes`, sem flash (script inline).
- Três opções: Claro · Escuro · Sistema (padrão).
- Dark mode **não é inversão**: superfícies em `neutral-950/900/850` com elevação
  por diferença de superfície (não por sombra, que não funciona no escuro).
- No escuro, cores semânticas ganham luminosidade e perdem saturação para manter
  contraste sem "vibrar".
- Contraste mínimo verificado nos dois temas: 4.5:1 texto normal, 3:1 texto grande
  e elementos de interface.

---

## 7.3 Tipografia

| Papel | Fonte | Motivo |
|---|---|---|
| Interface | **Inter** (variable) | Legibilidade excepcional em tamanhos pequenos, altura-x generosa, tabular numbers |
| Leitura longa | **Source Serif 4** | Documentos e resumos longos — serifa reduz fadiga em leitura extensa |
| Código / números técnicos | **JetBrains Mono** | Número CNJ, IDs, hashes |

Carregadas via `next/font` (self-hosted, `display: swap`, subset latin).

### Escala tipográfica (razão 1.2, base 16px)

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `display` | 36px / 40px | 700 | Título de página de destaque |
| `h1` | 30px / 36px | 600 | Título de página |
| `h2` | 24px / 32px | 600 | Seção |
| `h3` | 20px / 28px | 600 | Subseção, título de card |
| `h4` | 16px / 24px | 600 | Rótulo de bloco |
| `body-lg` | 18px / 28px | 400 | Leitura longa (serifa) |
| `body` | 14px / 20px | 400 | **Padrão da interface** |
| `body-sm` | 13px / 18px | 400 | Texto secundário |
| `caption` | 12px / 16px | 400 | Metadados, timestamps |
| `overline` | 11px / 16px | 600, `+0.05em`, maiúsculas | Rótulo de agrupamento |

**Regras:** `tabular-nums` obrigatório em tabelas, valores e datas (alinhamento
de colunas) · máximo de 75 caracteres por linha em texto corrido · nunca abaixo
de 12px · números de processo sempre em fonte mono.

---

## 7.4 Espaçamento e layout

Escala base **4px**: `0 · 1(4) · 2(8) · 3(12) · 4(16) · 5(20) · 6(24) · 8(32) ·
10(40) · 12(48) · 16(64) · 20(80) · 24(96)`.

**Regras de aplicação**
- Dentro de componente: 8px, 12px, 16px.
- Entre componentes: 16px, 24px.
- Entre seções: 32px, 48px.
- Padding de página: 24px (desktop), 16px (mobile).
- Largura máxima de conteúdo: 1280px (listas), 768px (leitura longa).

**Grid do AppShell**
```
Desktop ≥1280px   Sidebar 260px | Conteúdo fluido | Painel opcional 360px
Laptop 1024–1279  Sidebar 220px | Conteúdo fluido
Tablet 768–1023   Sidebar colapsada em ícones (64px)
Mobile <768       Sidebar em Sheet, bottom nav com 4 itens
```

Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

**Densidade:** dois modos (Confortável — padrão; Compacto — linhas de tabela e
paddings reduzidos ~25%). Preferência do usuário, persistida. A Camila (power user)
quer compacto; o Ricardo (sócio) quer confortável.

---

## 7.5 Elevação, bordas e raios

**Raios:** `sm 4px` (badge, tag) · `md 6px` (botão, input) · `lg 8px` (card,
dropdown) · `xl 12px` (modal, painel) · `full` (avatar, pill).

**Elevação — 5 níveis:** `0` plano (fundo) · `1` sutil (card em repouso) ·
`2` leve (card em hover, dropdown) · `3` média (popover, drawer) · `4` alta
(modal, command palette).

No dark mode, elevação é comunicada por **superfície mais clara**, não por sombra.

**Bordas:** 1px é o padrão; usar borda antes de sombra sempre que possível — é
mais leve visualmente e mais previsível nos dois temas.

---

## 7.6 Iconografia

**Lucide React** — traço 1.5px, tamanhos 16 (inline), 20 (padrão), 24 (destaque).

Ícones semânticos fixos por domínio: processo `Scale` · documento `FileText` ·
cliente `Building2`/`User` · prazo `CalendarClock` · IA `Sparkles` · busca `Search` ·
notificação `Bell` · auditoria `ShieldCheck`.

Ícone nunca aparece sozinho como única affordância de uma ação importante —
sempre com rótulo ou tooltip acessível.

---

## 7.7 Movimento

| Duração | Uso |
|---|---|
| 100ms | Micro-feedback (hover, foco) |
| 150ms | Entrada/saída de dropdown, tooltip |
| 200ms | Modal, drawer, transição de página |
| 300ms | Sidebar, mudanças de layout |

Easings: `ease-out` para entrada (rápido e depois desacelera — parece responsivo),
`ease-in` para saída.

**`prefers-reduced-motion` é respeitado obrigatoriamente** — animações reduzidas
a fade simples ou eliminadas.

Regra: animação comunica relação causal (de onde veio, para onde vai). Animação
decorativa é ruído e é removida.

---

## 7.8 Especificação de componentes-chave

### Button
Variantes: `default` (marca) · `secondary` · `outline` · `ghost` · `destructive` ·
`link` · `ai` (violeta, com ícone Sparkles).
Tamanhos: `sm 32px` · `default 36px` · `lg 40px` · `icon 36×36`.
Estados: rest, hover, active, focus-visible (anel 2px + offset 2px), disabled
(opacidade 50%, sem pointer), loading (spinner substitui ícone, largura preservada
para não saltar layout).

### Input
Altura 36px, padding 12px, borda 1px, raio 6px, foco com anel da marca.
Erro: borda `danger` + mensagem abaixo + `aria-invalid` + `aria-describedby`.
Suporta prefixo/sufixo, botão de limpar, contador de caracteres.

### DataTable
Cabeçalho fixo · ordenação por coluna · seleção múltipla com ações em lote ·
colunas configuráveis e persistidas · densidade · virtualização acima de 100 linhas ·
linha inteira clicável com ações no hover · skeleton com o número real de colunas ·
responsivo: em mobile vira lista de cards.

### Card
Padding 24px (16px compacto), raio 8px, borda 1px, elevação 1.
Slots: header (título + descrição + ação), content, footer.

### Badge / StatusBadge
Altura 20px, texto 11–12px, raio 4px. Ponto colorido + rótulo.
Mapeamento fixo de status → cor (documentado, nunca ad-hoc por tela).

### DeadlineBadge
Semáforo por urgência: `≤2 dias` danger · `≤7 dias` warning · `>7 dias` neutro ·
`vencido` danger com ícone de alerta · `concluído` success.
Exibe data absoluta **e** relativa ("12/08 · em 3 dias") — ambas importam.

### AIPanel
Fundo `ai-subtle`, borda esquerda 3px `ai`, ícone Sparkles.
Header: "Resumo gerado por IA" + data + botão atualizar.
Corpo: markdown com streaming (cursor pulsante durante geração).
Rodapé: citações de fonte clicáveis + 👍/👎 + copiar.
**Selo obrigatório:** "Gerado por IA — confira antes de usar."

### CommandPalette
Overlay centralizado, largura 640px, elevação 4, backdrop com blur.
Input com ícone de busca · resultados agrupados por tipo com cabeçalho ·
navegação por teclado com item ativo destacado · atalho exibido à direita ·
estado vazio com sugestões · loading inline sem trocar o conteúdo por skeleton.

### Timeline
Linha vertical à esquerda, marcadores por tipo de evento (ícone + cor).
Agrupamento por dia com cabeçalho fixo · conteúdo expansível · filtro por tipo ·
carregamento incremental para cima · eventos de IA visualmente distintos (violeta).

### EmptyState
Ilustração simples de linha (não estoque genérico) · título curto · uma frase de
explicação · ação primária · link de ajuda opcional. Quatro variantes obrigatórias
(primeiro-uso, sem-resultado, erro, sem-permissão) — ver [03](03-fluxos-e-telas.md) §3.11.

---

## 7.9 Padrões de acessibilidade

- Todo elemento interativo alcançável por `Tab`, com `focus-visible` de 2px.
- Modais: foco preso, `Esc` fecha, foco retorna à origem.
- `aria-live="polite"` para toasts e resultados de busca; `assertive` para erros.
- Rótulos reais em todo campo (`placeholder` **não** é rótulo).
- Ícone-botão sempre com `aria-label`.
- Alvos de toque ≥44×44px em mobile.
- Cor nunca é o único portador de informação — sempre acompanhada de ícone ou texto.
- Skip link "Ir para o conteúdo" na primeira posição de tab.
- Verificação automatizada com axe-core no CI; zero violação crítica bloqueia merge.

---

## 7.10 Governança do Design System

- Tokens vivem em `styles/globals.css` — fonte única, sem cor hard-coded em componente.
- Componentes documentados em **Storybook**, com todos os estados e ambos os temas.
- Primitivo do shadcn/ui não é editado para atender uma tela específica; compõe-se
  por cima. Alteração em primitivo exige justificativa e revisão.
- Novo componente só entra no diretório compartilhado quando é usado por ≥2
  features. Antes disso, mora dentro da feature.
- Checklist de aceite de componente: estados completos · dark + light · teclado ·
  leitor de tela · responsivo · Storybook · teste.

---

**Anterior:** [06-modelo-dominio.md](06-modelo-dominio.md) · **Próximo:** [08-especificacao-modulos.md](08-especificacao-modulos.md)
