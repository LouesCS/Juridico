# 16 — Wireframes

> ASCII, neutros de tema, com anotação de área clicável, navegação e
> comportamento. Complementam os wireframes já embutidos em
> [05](05-dashboard.md)–[11](11-notificacoes.md).

## 16.1 Login

```
┌──────────────────────────────────────────┐
│                                            │
│              [Logo Quilombo Dev]           │
│                                            │
│   E-mail     [_____________________]       │  ← foco automático ao carregar
│   Senha      [_____________________] 👁     │
│                                            │
│   [        Entrar        ]                 │  ← ação primária, largura total
│                                            │
│   ──────────── ou ────────────             │
│   [ G  Continuar com Google ]               │  ← clicável
│   [ ⊞  Continuar com Microsoft ]            │  ← clicável
│                                            │
│   Esqueceu a senha?   Criar conta          │  ← links, texto secundário
└──────────────────────────────────────────┘
```
Comportamento: `Enter` em qualquer campo submete o formulário; erro de
credencial aparece abaixo do botão "Entrar" (inline, não toast — reafirma
[14-ux-writing.md](14-ux-writing.md)).

## 16.2 Tela do Processo (detalhe completo)

```
┌────────────────────────────────────────────────────────────────┐
│ ‹ Processos                                                       │
│ Ação Trabalhista — Reclamante Silva                 🔵 Ativo      │  ← título editável inline
│ nº 0001234-56.2026.5.02.0001 · Cliente: João Silva ↗               │  ← link ao perfil do cliente
│ [avatar] Camila T.   📅 12/08 (3 dias)                             │
│                                                                    │
│ [✨ Resumir com IA] [＋ Documento] [＋ Prazo]              [⋮]     │  ← ✨ = ação primária
├────────────────────────────────────────────────────────────────┤
│ Visão Geral │ Timeline │ Documentos │ Prazos │ Partes │ ... │      │  ← tabs, clicáveis
├──────────────────────────────┬───────────────────────────────────┤
│  ✨ RESUMO IA                  │  METADADOS                        │
│  (conteúdo em streaming)       │  Área · Tribunal · Valor           │
│  [Petição inicial ↗] [p.2 ↗]  │  Tags: [Urgente] [+]               │
│  👍 👎                          ├───────────────────────────────────┤
│                                │  EQUIPE                            │
│  PRÓXIMOS PRAZOS                │  [avatar] Camila (resp.)           │
│  🔴 Contestação — 12/08        │  [+ adicionar]                     │
└──────────────────────────────┴───────────────────────────────────┘
```
Área clicável: título (edição inline), nome do cliente (navega ao perfil),
cada tab (troca de painel sem reload), fontes citadas no resumo (abrem
documento/evento exato), avatar de responsável (abre card de contato rápido).

## 16.3 Command Palette (Busca Global)

```
        ┌──────────────────────────────────────────────┐
        │ 🔍  processo silva_                             │  ← foco automático
        ├──────────────────────────────────────────────┤
        │  PROCESSOS                                       │
        │  ▸ Ação Trabalhista — Reclamante Silva           │  ← item ativo (seta) destacado
        │    nº 0001234-56...2026...                        │
        │  DOCUMENTOS                                      │
        │    Procuração — Silva.pdf                         │
        │  CLIENTES                                         │
        │    João Silva                                     │
        ├──────────────────────────────────────────────┤
        │  ↑↓ navegar   ↵ abrir   Tab filtrar   esc fechar  │
        └──────────────────────────────────────────────┘
```
Comportamento: overlay com backdrop semi-transparente; `Esc` ou clique fora
fecha sem alterar a tela de fundo; resultados atualizam a cada tecla (200ms
debounce).

## 16.4 Tela de Clientes — Perfil

```
┌────────────────────────────────────────────────────────────────┐
│ ‹ Clientes                                                        │
│ João Silva (PF)                                  [Editar]  [⋮]    │
│ CPF: ***.**6-78 · joao@email.com · (11) 9****-1234                 │
├────────────────────────────────────────────────────────────────┤
│ Visão Geral │ Processos │ Documentos │ Contato │ Histórico │        │
├──────────────────────────────┬───────────────────────────────────┤
│  PROCESSOS ATIVOS (3)          │  RESPONSÁVEL                       │
│  • Ação Trabalhista ↗          │  [avatar] Camila T.                 │
│  • Divórcio Consensual ↗       │                                     │
│  [+ novo processo]              │  OBSERVAÇÕES                        │
└──────────────────────────────┴───────────────────────────────────┘
```

## 16.5 Documentos — Biblioteca

```
┌────────────────────────────────────────────────────────────────┐
│  Documentos                                  [+ Enviar documento] │
│  [Buscar nesta lista...]  [Filtros ▾]        [▦ Grid] [☰ Lista]    │
├───────────┬──────────────────────────────────────────────────────┤
│ 📁 Todas   │  ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│ 📁 Contra..│  │ 📄 PDF   │ │ 📄 PDF   │ │ 🖼 JPG   │                  │
│ 📁 Petições│  │contrato  │ │procurac. │ │comprov.  │                  │
│           │  │2,3 MB    │ │890 KB    │ │1,1 MB    │                  │
│           │  └─────────┘ └─────────┘ └─────────┘                  │
└───────────┴──────────────────────────────────────────────────────┘
```
Área de drop: toda a região à direita da árvore de pastas aceita
arrastar-soltar; clique no card abre preview em painel/modal.

## 16.6 Dashboard (reafirma [05-dashboard.md §5.2](05-dashboard.md))

Ver wireframe completo já especificado — não duplicado aqui.

## 16.7 Notificações (drawer)

Ver wireframe em [11-notificacoes.md §11.1](11-notificacoes.md).

## 16.8 Tela Administrativa — Usuários

```
┌────────────────────────────────────────────────────────────────┐
│  Usuários                                       [+ Convidar]      │
│  [Buscar...] [Filtro: papel ▾] [Filtro: status ▾]                  │
├────────────────────────────────────────────────────────────────┤
│  Nome           E-mail              Papel      Status    ⋮        │
│  Camila T.      camila@...          Advogado   Ativo     ⋮        │
│  Lucas F.       lucas@...           Estagiário Ativo     ⋮        │
│  Convite pend.  novo@...            Assistente Pendente  ⋮        │
└────────────────────────────────────────────────────────────────┘
```
Menu "⋮" por linha: Alterar papel, Reenviar convite (se pendente), Desativar.

## 16.9 Onboarding — Novo Escritório

```
┌──────────────────────────────────────────┐
│  ● ─── ○ ─── ○ ─── ○     (passo 1 de 4)    │
│                                            │
│  Como se chama seu escritório?             │
│  [_____________________________]           │
│                                            │
│                          [Pular] [Continuar]│
└──────────────────────────────────────────┘
```
"Pular" com o mesmo peso visual de "Continuar" em etapas não essenciais
(reafirma [01-design-principles.md §1.1](01-design-principles.md)).

---

**Anterior:** [15-acessibilidade.md](15-acessibilidade.md) · **Próximo:** [17-responsividade.md](17-responsividade.md)
