# 06 — Tela do Processo

> A tela mais importante do produto em profundidade de uso (reafirma
> [../03-fluxos-e-telas.md §3.4.2](../03-fluxos-e-telas.md) e entidades de
> [../database/04-entidades-clientes-processos.md](../database/04-entidades-clientes-processos.md)).

## 6.1 Header (persistente em todas as abas)

```
┌──────────────────────────────────────────────────────────────┐
│ ‹ Processos                                                    │
│ Ação Trabalhista — Reclamante Silva            [🔵 Ativo]      │
│ nº 0001234-56.2026.5.02.0001 · Cliente: João Silva              │
│ Responsável: [avatar] Camila T.   Próximo prazo: 12/08 (3 dias) │
│                                                                  │
│ [Resumir com IA] [＋ Documento] [＋ Prazo] [⋮ Mais ações]        │
├──────────────────────────────────────────────────────────────┤
│ Visão Geral | Timeline | Documentos | Prazos | Partes | Comentários | Histórico │
└──────────────────────────────────────────────────────────────┘
```

**Elementos do header:** breadcrumb de volta · título editável inline (clique
no título ativa edição, sem modal) · badge de status com cor semântica ·
número CNJ em fonte monoespaçada · nome do cliente (link para perfil do
cliente) · avatar + nome do responsável · badge de próximo prazo com semáforo
· ação primária (`Resumir com IA`, cor `ai`) · ações secundárias em `outline`
· menu "⋮" com Arquivar/Excluir/Duplicar/Exportar.

**Badge de segredo de justiça:** quando aplicável, ícone de cadeado ao lado do
status, com tooltip "Segredo de justiça — acesso restrito à equipe".

## 6.2 Aba Visão Geral

```
┌───────────────────────────────┬──────────────────────────────┐
│  RESUMO POR IA                 │  METADADOS                    │
│  ✨ Gerado em 28/07 · atualizar │  Área: Trabalhista             │
│  "O processo trata de..."      │  Tribunal: TRT-2               │
│  Fontes: [Petição inicial] ... │  Vara: 1ª Vara do Trabalho      │
│  👍 👎                          │  Valor da causa: R$ 15.000,00  │
│                                 │  Distribuído em: 10/01/2026     │
├───────────────────────────────┤  Tags: [Urgente] [Rescisão]     │
│  PRÓXIMOS PRAZOS (3)            ├──────────────────────────────┤
│  🔴 Contestação — 12/08         │  EQUIPE                       │
│  🟡 Audiência — 20/08           │  [avatar] Camila T. (resp.)    │
├───────────────────────────────┤  [avatar] Lucas F.              │
│  DOCUMENTOS RECENTES (3)        │  [+ adicionar]                  │
└───────────────────────────────┴──────────────────────────────┘
```

### 6.2.1 Painel de Resumo por IA — especificação completa

- **Como aparece:** painel de card com fundo `ai-subtle`, borda esquerda 3px
  `ai`, ícone `Sparkles` — nunca modal (o resumo é referência, o usuário
  precisa continuar vendo o resto do processo enquanto lê).
- **Quando aparece:** por padrão, se já existe um resumo vigente, ele é
  exibido imediatamente ao entrar na aba (sem clique adicional); se não existe,
  aparece um `EmptyState` com botão "Gerar resumo com IA".
- **Como responde:** streaming token a token, com cursor pulsante ao final do
  texto sendo escrito — nunca uma barra de progresso genérica sem preview do
  conteúdo.
- **Como mostra confiança:** não há indicador numérico de confiança (evita
  falsa precisão) — a confiança é comunicada pela presença de fontes citadas
  e pela linguagem do texto (afirmações qualificadas, nunca categóricas sobre
  mérito jurídico).
- **Como mostra fontes:** lista de chips clicáveis abaixo do texto — "Petição
  inicial, p.2" · "Andamento de 15/03" — clique abre o documento/evento
  exato na aba correspondente.
- **Como mostra custo:** não é exibido ao usuário final (Advogado/Estagiário)
  — custo é informação de gestão, visível apenas em
  Admin/Owner/Sócio ([10-perfil.md](10-perfil.md) não se aplica aqui; ver
  painel administrativo de uso de IA).
- **Como mostra processamento:** estado "Gerando resumo..." com esqueleto de
  3 linhas de texto que vão sendo substituídas pelo streaming real.
- **Como mostra erro:** card muda para estado de erro discreto (borda `danger`
  sutil, não vermelho vibrante) com texto "Não foi possível gerar o resumo
  agora" + botão "Tentar novamente" — nunca um erro técnico bruto.
- **Como mostra que não substitui orientação jurídica:** selo fixo, sempre
  visível, no rodapé do painel: **"Gerado por IA — confira antes de usar"** —
  nunca removível, nunca escondido atrás de tooltip.

## 6.3 Aba Timeline

```
│  [Filtrar: Todos ▾] [Andamentos] [Documentos] [Comentários] [IA]│
│                                                                   │
│  ● 20/08  Audiência de instrução agendada          [Prazo]       │
│  ● 15/03  Contestação anexada — contrato-v2.pdf    [Documento]   │
│  ● 15/03  "Já revisei, pode protocolar" — Camila   [Comentário]  │
│  ● 10/01  Processo distribuído                     [Sistema]     │
```

Linha vertical à esquerda com marcador colorido por tipo (reafirma
[../07-design-system.md §7.8](../07-design-system.md) `Timeline`).
Agrupamento por dia com cabeçalho de data fixo ao rolar. Carregamento
incremental para cima (mais antigo) via scroll — nunca paginação numerada
(quebraria a sensação de "linha do tempo contínua"). Item de IA visualmente
distinto (fundo `ai-subtle` sutil no marcador).

## 6.4 Aba Documentos

Grid de `DocumentCard` (ver [13-componentes.md](13-componentes.md)),
agrupável por pasta. Botão "+ Documento" abre a mesma área de drag-and-drop de
[07-documentos.md](07-documentos.md), mas com `processoId` pré-preenchido —
nunca pede para o usuário selecionar o processo de novo.

## 6.5 Aba Prazos

Lista ordenada por vencimento, cada linha com: checkbox de conclusão rápida
(clique marca `CONCLUIDO` sem abrir modal), título, tipo (badge), responsável,
data com semáforo. Prazo `FATAL` tem indicador visual adicional (borda
esquerda vermelha) — nunca apenas cor de texto (acessibilidade).

## 6.6 Aba Partes

Lista de `ParteProcesso` agrupada por tipo (Autor, Réu, Testemunha, etc.).
Cada item: nome, documento mascarado, badge de tipo, indicador "É nosso
cliente" quando aplicável. Botão "+ Adicionar parte" com formulário mínimo
(nome + tipo obrigatórios, resto opcional).

## 6.7 Aba Comentários

Thread de 1 nível (reafirma
[../database/05-entidades-documentos-colaboracao.md §5.5](../database/05-entidades-documentos-colaboracao.md)),
campo de novo comentário sempre visível no rodapé, suporte a `@menção` com
autocomplete dos membros da equipe do processo.

## 6.8 Aba Histórico

Trilha de auditoria filtrada a este processo — somente leitura, visível a
quem tem `audit:read`. Não confundir com a Timeline (produto) — aqui é
"quem alterou o quê", reafirma
[../database/02-convencoes-dados.md §2.16](../database/02-convencoes-dados.md).

## 6.9 Painel lateral (contexto persistente, opcional, ⌥ para abrir/fechar)

Quando aberto (tela ≥1280px), mostra Metadados + Equipe fixos enquanto o
usuário navega entre abas — evita ter que voltar à Visão Geral para conferir
"quem é o responsável mesmo?".

## 6.10 Botões e hierarquia de ação

| Ação | Tipo de botão | Posição |
|---|---|---|
| Resumir com IA | `ai` (violeta, ícone Sparkles) — ação primária desta tela | Header |
| Novo Documento / Novo Prazo | `secondary` | Header |
| Editar campo (título, metadados) | Inline, sem botão — clique direto no texto | Onde o campo aparece |
| Arquivar / Excluir / Duplicar | Dentro do menu "⋮" | Header, canto direito |

## 6.11 Estados

| Estado | Comportamento |
|---|---|
| Carregando | Skeleton do header + abas, conteúdo da aba ativa com skeleton próprio |
| Erro | Header carrega normalmente se possível; aba com erro mostra "Tentar novamente" isolado |
| Vazio (aba Documentos sem documentos) | `EmptyState` com CTA "Enviar primeiro documento" |
| Vazio (aba Timeline recém-criado) | Mostra apenas o evento de criação — nunca uma tela em branco |
| Sem permissão (segredo de justiça) | Tela 404 completa, não uma versão "cinza" da tela |

## 6.12 Permissões

Reafirma matriz de [../database/08-permissoes-seguranca.md §8.3](../database/08-permissoes-seguranca.md):
botões de escrita (editar, novo documento, novo prazo) ocultos — não
desabilitados — para quem não tem a permissão. Segredo de justiça filtra o
acesso à tela inteira antes mesmo de qualquer aba renderizar.

## 6.13 Responsividade

Desktop: header + abas horizontais + painel lateral opcional. Tablet: painel
lateral fecha por padrão, abas horizontais com scroll. Mobile: abas viram
menu suspenso (`Select`) em vez de tabs horizontais; header colapsa metadados
secundários atrás de "Ver mais".

## 6.14 Wireframe de referência

Ver ASCII completo em [16-wireframes.md §16.2](16-wireframes.md).

## 6.15 Critérios de aceite

- Header nunca desaparece ao trocar de aba (contexto sempre visível).
- Resumo de IA visível sem scroll ao entrar na aba Visão Geral, em tela ≥13".
- Nenhuma ação de escrita disponível para quem só tem `case:read`.
- Timeline pagina 10k+ eventos sem travar o scroll (reafirma orçamento de
  performance de [../04-arquitetura-frontend.md §4.7](../04-arquitetura-frontend.md)).
- Troca de aba não perde o estado de scroll da aba anterior ao voltar.

---

**Anterior:** [05-dashboard.md](05-dashboard.md) · **Próximo:** [07-documentos.md](07-documentos.md)
