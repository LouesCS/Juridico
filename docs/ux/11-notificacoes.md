# 11 — Notificações

> Reafirma [../03-fluxos-e-telas.md §3.7](../03-fluxos-e-telas.md),
> [../08-especificacao-modulos.md §8.6](../08-especificacao-modulos.md) e
> entidade `Notificacao` em
> [../database/06-entidades-ia-notificacoes-auditoria.md §6.4](../database/06-entidades-ia-notificacoes-auditoria.md).

## 11.1 Central (drawer, ver [04-navigation.md §4.4](04-navigation.md))

```
┌─────────────────────────────────┐
│ Notificações            [Marcar todas como lidas] │
│ [Todas] [Não lidas] [Segurança]   │
├─────────────────────────────────┤
│ ● 🔵 Novo andamento — Caso Silva   há 5 min │
│ ● 🟡 Prazo em 3 dias — Caso Souza  há 2h    │
│   ✓ Comentário respondido          ontem     │
├─────────────────────────────────┤
│              [Ver todas as notificações →]   │
└─────────────────────────────────┘
```
Não lidas com ponto de destaque à esquerda; lidas em opacidade reduzida.
Ícone por tipo de evento (reafirma iconografia de
[../07-design-system.md §7.6](../07-design-system.md)).

## 11.2 Agrupamento

Notificações de baixa criticidade e alta frequência (novo andamento, novo
documento) agrupam por `agrupamentoChave` — "3 novos documentos no Caso
Silva" em vez de 3 linhas separadas. Notificações de alta prioridade
(segurança, @menção, prazo) nunca agrupam — cada uma aparece individualmente,
sempre.

## 11.3 Prioridade

| Prioridade | Indicador visual | Comportamento |
|---|---|---|
| Segurança | Ícone de escudo, cor `danger`, sempre no topo | Não desativável, envia por todos os canais habilitados |
| Alta | Ponto colorido `warning` | Agrupamento desabilitado |
| Normal | Ponto neutro | Pode agrupar |
| Baixa | Sem destaque visual, aparece esmaecida | Só entra em digest de e-mail, nunca push in-app isolado |

## 11.4 Leitura

Marcar como lida acontece automaticamente ao clicar (navega + marca em uma
ação, nunca dois passos) **e** manualmente via ícone de "check" no hover da
linha, para quem quer limpar sem abrir. "Marcar todas como lidas" no topo do
painel, sem confirmação (ação reversível de baixo risco).

## 11.5 Arquivamento

Notificações somem da lista ativa após lidas + 90 dias (automático, não é
ação do usuário) — não há botão manual de "arquivar" no MVP; simplicidade
sobre completude (princípio 1).

## 11.6 Filtros

Chips no topo: Todas / Não lidas / Segurança — filtro simples, sem construtor
de filtro avançado (volume de notificação não justifica complexidade).

## 11.7 Histórico

"Ver todas as notificações" abre página completa (`/notificacoes`) com lista
paginada por cursor, mesmos filtros da central + filtro adicional por tipo de
evento e por processo relacionado.

## 11.8 Estados

Vazio: "Você está em dia — nenhuma notificação nova" (tom positivo, não
neutro/vazio-triste). Erro ao carregar: "Não foi possível carregar
notificações" + tentar novamente, badge do sino mantém a última contagem
conhecida (nunca zera silenciosamente por erro de rede).

## 11.9 Permissões

Cada usuário só vê as próprias notificações — não há tela de "notificações de
outro usuário" em nenhum papel, nem Admin.

---

**Anterior:** [10-perfil.md](10-perfil.md) · **Próximo:** [12-design-system.md](12-design-system.md)
