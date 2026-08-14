# 06 — Autorização

## 6.1 Princípio inegociável

> **A UI pode esconder uma ação; o backend continua sendo a autoridade
> final.** Todo `PermissionGate`/`RoleGate`/botão desabilitado é UX
> (evita o usuário clicar em algo que vai falhar), nunca a camada de
> segurança real. Uma requisição enviada apesar da UI esconder o botão
> (via devtools, replay, bug) **precisa** ser recusada pelo backend do
> mesmo jeito — reafirma `docs/backend/06-autorizacao.md` e
> `docs/api/03-autorizacao.md`.

## 6.2 Modelo que o frontend consome (não reimplementa)

O backend resolve autorização em duas etapas (`docs/api/03-autorizacao.md
§3.1`): permissão de ação (`recurso:acao:escopo`, ex. `case:read:assigned`)
e autorização de recurso (é *este* processo específico que o usuário pode
ver — segredo de justiça, equipe, tenant). **O frontend só replica a
primeira etapa** (é barato: `permissions: string[]` já vem no JWT/claim
resolvido, exposto via `GET /me`) — a segunda etapa nunca é replicada no
cliente, porque exigiria carregar dado sensível (quem está na equipe do
processo, se é segredo de justiça) só para decidir se esconde um botão, o
que already vaza a informação que o 404 deveria esconder. Ver §6.4.

## 6.3 `Can` / `PermissionGate` / `RoleGate` / hooks

```tsx
// components/auth/permission-gate.tsx — esqueço de padrão, não implementação final
<PermissionGate permission="case:delete">
  <Button variant="destructive">Excluir</Button>
</PermissionGate>

<RoleGate roles={['OWNER', 'ADMIN']}>
  <AdminNavItem />
</RoleGate>

<Can do="case:update" fallback={null}>
  {/* children só renderiza com a permissão */}
</Can>
```

- `PermissionGate`/`Can` (mesma responsabilidade, `Can` é o nome usado
  quando a checagem embrulha children arbitrário em vez de um componente
  nomeado) leem de `usePermission()`, hook que consulta
  `lib/permissions/` contra o array `permissions` de `useCurrentUser()`
  (§5.3) — comparação client-side idêntica à do backend
  (`recurso:acao:{TEAM|ASSIGNED|OWN}` também satisfeito por
  `recurso:acao:all`, mesma regra de `docs/api/03-autorizacao.md §3.8`).
- `RoleGate` é açúcar sintático sobre papéis do sistema
  (`OWNER`/`ADMIN`/`SOCIO`/...) — usado só para os poucos casos onde a
  regra é literalmente "só estes papéis" (ex.: item Admin na Sidebar), não
  para regra de negócio fina (que deve ser expressa como permissão, não
  papel hardcoded).
- **Nenhum destes componentes faz chamada de rede.** São só leitura de um
  array já carregado — permissão nunca é buscada sob demanda por botão.
- Menus/Sidebar: `config/navigation.ts` já filtra itens por permissão
  antes de montar a árvore (reafirma `docs/04-arquitetura-frontend.md
  §4.8`) — item ausente, nunca item acinzentado, para o caso "não tem
  permissão nenhuma sobre esta área" (ex.: item Admin some inteiro).
  Botões dentro de uma tela já visível (ex.: "Excluir" num processo que o
  usuário pode ler mas não apagar) usam `PermissionGate`, que pode optar
  por ocultar **ou** desabilitar com tooltip explicativo, dependendo do
  caso de UX documentado na tela correspondente.

## 6.4 Segredo de justiça e confidencialidade — a UI nunca revela existência

Regra do backend (`docs/api/03-autorizacao.md §3.4`, reafirmada aqui sem
alteração): um processo em segredo de justiça ou documento confidencial
sem acesso retorna **404**, nunca **403** — porque 403 já confirmaria "isto
existe". Consequências diretas para o frontend:

- `error.tsx`/`not-found.tsx` de processo e documento é **o mesmo
  componente**, com o **mesmo texto**, para "não existe", "não é deste
  tenant" e "existe mas você não tem acesso". Nenhuma variação de mensagem,
  nenhum log de console, nenhum título de página diferenciado — qualquer
  uma dessas pistas já seria um vazamento de informação por um canal
  lateral.
- **Nenhum dado do recurso é mantido em cache client-side** após um `404`
  desse tipo — se uma navegação anterior já havia carregado parcialmente o
  processo (ex.: veio de uma busca) e a chamada de detalhe retorna `404`,
  a entrada de cache correspondente é removida (`queryClient.removeQueries`),
  não apenas marcada como erro — para que um re-render acidental não
  exiba, ainda que por um instante, dado que o 404 já disse não existir.
- Listagens (Processos, Busca Global) **nunca** tentam adivinhar
  client-side se um item vai dar 404 antes do clique — a decisão de
  incluir ou não um item na lista já veio filtrada do backend
  (`docs/api/03-autorizacao.md §3.6`); o frontend não aplica um segundo
  filtro de "será que este é sigiloso".
- Documento confidencial é uma exceção documentada e deliberada
  (`docs/ux/07-documentos.md`): o **card continua na lista** (preserva
  contagem/organização visual), só o clique para abrir o preview retorna
  `EmptyState` "Acesso restrito" — isto é uma decisão de produto já
  tomada na etapa de UX, não uma inconsistência com a regra de 404 acima
  (a lista de documentos já veio filtrada por permissão de leitura de
  metadado, que é mais ampla que permissão de conteúdo).

## 6.5 Proteção de rota vs. proteção de ação

- **Proteção de rota** (ex.: `/admin/*` sem nenhuma permissão
  administrativa): verificada no próprio Server Component da rota (não no
  middleware — middleware só sabe "autenticado", não "autorizado para
  isto", reafirma [04-app-router.md §4.4](04-app-router.md)); falha
  redireciona para `/` com toast discreto, **não** para um 404 (a
  existência de `/admin` como conceito não é segredo, diferente de um
  processo específico).
- **Proteção de ação dentro de uma tela já visível** (excluir, editar,
  convidar): `PermissionGate` ao redor do botão/menu-item.
- **Proteção de recurso individual** (este processo, este documento):
  nunca decidida no frontend — decidida pelo backend, manifestada como
  404/403 na resposta, tratada por [23-errors.md](23-errors.md).

## 6.6 Equipe do processo, responsável e ownership

`ASSIGNED`/`TEAM`/`OWN` (escopos do backend) não são recalculados no
frontend — o array `permissions` do usuário já vem resolvido pelo backend
por sessão/escritório ativo (não por processo individual). Ações que
dependem de ownership de um recurso específico (ex.: só o autor pode
editar seu próprio comentário) comparam `autorId === currentUser.id` no
componente — comparação de dado já presente na resposta, não uma nova
checagem de permissão.

---

**Anterior:** [05-autenticacao.md](05-autenticacao.md) · **Próximo:** [07-office-context.md](07-office-context.md)
