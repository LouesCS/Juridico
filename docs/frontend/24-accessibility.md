# 24 — Acessibilidade

Reafirma integralmente `docs/ux/15-acessibilidade.md` (WCAG 2.1 AA como
piso, não meta) — este documento cobre só a implementação técnica que
garante isso, sem redefinir nenhum critério.

## 24.1 Por que Radix/shadcn como base já resolve a maior parte

`docs/04-arquitetura-frontend.md §4.1` já decidiu Radix como primitiva
base pelo motivo exato deste capítulo: `Dialog`, `DropdownMenu`,
`Popover`, `Tabs`, `Tooltip`, `Toast` do Radix já implementam
foco-preso/`aria-*`/navegação por teclado corretamente — o trabalho de
acessibilidade desta arquitetura é **não quebrar** o que o primitivo já
garante ao compor por cima (reafirma a regra "não editar primitivo para
atender uma tela", [13-design-system.md §13.3](13-design-system.md)), e
**adicionar** o que é específico de domínio (Data Grid, upload,
streaming de IA) que nenhum primitivo genérico cobre sozinho.

## 24.2 Padrões por componente (implementação do que `docs/ux/15` especifica)

| Componente | Implementação |
|---|---|
| Campo de formulário com erro | `aria-invalid="true"` + `aria-describedby` apontando pro `id` da mensagem — gerado automaticamente pelo wrapper `FormField` (React Hook Form + Radix `Label`), nunca manual por tela |
| Botão só com ícone | `aria-label` obrigatório — lint customizado falha o build se um `<Button>` sem texto visível não tiver `aria-label` |
| Modal/Drawer | `role="dialog"`/`aria-modal` (Radix já fornece); foco move para o primeiro elemento focável ao abrir, retorna à origem ao fechar (padrão do Radix `Dialog`/`Sheet`) |
| Toast | `aria-live="polite"` (sucesso) / `"assertive"` (erro) — Radix Toast já expõe essa prop |
| Tabs (header do Processo) | `role="tablist"/"tab"` + `aria-selected` (Radix `Tabs`) |
| Data Grid | `<th scope="col">` real (nunca `<div>` estilizado), `aria-sort`, `aria-rowcount`/`aria-colcount` — implementado na wrapper `DataTable` sobre TanStack Table, uma vez, reaproveitado por Processos/Documentos |
| Upload/progresso | `role="progressbar"` + `aria-valuenow/min/max` no `FileCard` durante envio |
| Streaming de IA | Container com `aria-live="polite"`, mas **debounced para anunciar só ao final do stream** — decisão já registrada em `docs/ux/19-decisoes.md §19.3` (evita spam de anúncio token-a-token) |
| Command Palette | `role="combobox"` + `aria-expanded` + `listbox` (`cmdk` já fornece) |
| Breadcrumb | `nav aria-label="breadcrumb"`, último item `aria-current="page"` |
| Drag-and-drop (upload, mover documento entre pastas) | Sempre com alternativa por clique/menu (`FileDropzone` tem botão "Selecionar arquivo"; `DocumentCard` tem "Mover para pasta..." no menu "⋮") — nenhuma ação existe **somente** via arraste |

## 24.3 Foco e navegação por teclado

- **Skip link** "Ir para o conteúdo" — primeiro elemento tabulável de toda
  página autenticada, implementado no `AppShell` (`(app)/layout.tsx`),
  não repetido por rota.
- **Mapa de atalhos** (`docs/ux/04-navigation.md §4.9`) registrado
  centralmente em `hooks/use-hotkey.ts` + `?` abre o modal de atalhos —
  nenhuma feature registra listener de teclado global por conta própria
  fora deste hook, para evitar dois atalhos concorrendo pela mesma tecla.
- Atalhos de tecla única (`G`, `N`, `/`) usam sequência (`G` então `D`) —
  já é uma decisão de UX (`docs/ux/19-decisoes.md`), implementada como
  máquina de estado simples de 2 teclas com timeout de 1s no mesmo hook.

## 24.4 `prefers-reduced-motion`

Toda animação usa classes `motion-safe:`/`motion-reduce:` do Tailwind —
`prefers-reduced-motion: reduce` reduz para fade instantâneo ou remove a
transição, exceto o cross-fade de skeleton→conteúdo (150ms), que
permanece mesmo com o preference ativo (decisão já registrada em
`docs/ux/12-design-system.md §12.8`).

## 24.5 Verificação — CI gate

`axe-core` via `@axe-core/playwright` (E2E) e `jest-axe`/equivalente
Vitest (componente) — zero violação crítica bloqueia merge, reafirma
`docs/ux/15-acessibilidade.md` e [30-ci.md §30.3](30-ci.md). Detalhes de
qual teste roda em qual nível (componente vs. E2E) em
[27-tests.md §27.5](27-tests.md).

---

**Anterior:** [23-errors.md](23-errors.md) · **Próximo:** [25-security.md](25-security.md)
