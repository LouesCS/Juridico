# 05 — Contexto de Escritório

## Implementado e testado

Reafirma `docs/frontend/07-office-context.md`. Código real em:

```text
src/stores/office.store.ts              # Zustand — espelho, não persistido
src/lib/broadcast/office-channel.ts      # BroadcastChannel entre abas
src/features/office/
  api/office.api.ts                      # POST /auth/switch-office
  api/mutations.ts                       # useSwitchOffice
  hooks/use-office.ts                    # useOffice, useActiveOffice
  components/workspace-switcher.tsx
  index.ts
src/providers/office-provider.tsx        # sincroniza store com GET /me + BroadcastChannel
src/app/(app)/_components/office-gate.tsx     # bloqueia a árvore em status 'no-office'
src/app/(app)/_components/no-office-state.tsx
```

`OfficeProvider` é montado em `app/(app)/layout.tsx`, dentro do
`QueryProvider` já existente.

## Fluxo de troca — implementado conforme §7.3

1. `WorkspaceSwitcher` (dropdown só quando há >1 escritório conhecido,
   §7.6) chama `useSwitchOffice().mutate({ escritorioId })`.
2. `onSuccess`: `queryClient.clear()` inteiro (nunca invalidação
   seletiva, §7.4) → `store.setActive()` → publica `office-switched` no
   `BroadcastChannel('quilombo-office')`. O componente chamador
   redireciona para `/`.
3. `onError` 403 (`FORBIDDEN` — vínculo removido entre carregar a lista e
   clicar): `store.removeOffice()` local, sem nova chamada de rede;
   permanece no escritório atual; toast de erro.
4. Outra aba recebendo `office-switched`: `OfficeProvider` executa
   `queryClient.clear()` + `store.setActive()` — **não** navega (o texto
   exato do documento diz "outras abas também fazem (a) a (d)", não (f)).

## Estados implementados

| Estado | Onde |
|---|---|
| Sem escritório (`GET /me` resolve mas `escritorio.id` vazio) | `OfficeGate` renderiza `NoOfficeState` (link para `/registro`, mesmo fluxo de criar escritório) em vez do App Shell |
| Um único escritório | `WorkspaceSwitcher` mostra só o nome, sem affordance de dropdown |
| Falha durante a troca (403) | Toast + remoção local do item, sem navegar |
| Sincronização entre abas | `BroadcastChannel`, testado com dois canais reais no mesmo processo (Node 18+ expõe `BroadcastChannel` global, usado tal qual em produção) |

## Limitação real de backend descoberta nesta etapa

`GET /me` (`apps/api/src/modules/identity/application/use-cases/get-current-user.use-case.ts`)
retorna só o escritório **ativo** (`escritorio: { id, nome, slug }`) — não
existe hoje nenhum endpoint que liste todos os escritórios/memberships de
um usuário fora da resposta de `POST /auth/login` (`escritorios[]`). Isso
significa que a lista completa de escritórios só é conhecida durante a
sessão em que o login aconteceu nesta aba; um reload de página (sessão
retomada só pelo cookie, sem novo login) faz `WorkspaceSwitcher` degradar
para o caso "um único escritório" mesmo que o usuário pertença a vários —
comportamento correto dado o dado disponível, não um bug, mas uma
limitação de contrato registrada em [19-decisions.md §19.8](19-decisions.md)
como pendência de backend (endpoint `GET /me/offices` ou equivalente).

## Não implementado nesta etapa

- Reabertura de conexão SSE ao trocar de escritório (§7.5) — nenhuma
  conexão SSE existe ainda no projeto (Etapa 16, pendente).
- Detecção de vínculo revogado **durante** a navegação (não no boot) —
  exigiria checagem genérica de 403 em qualquer chamada do cliente HTTP,
  hoje só trata 401; registrado como pendência explícita em
  `stores/office.store.ts` e em [19-decisions.md §19.8](19-decisions.md).
- `PermissionGate`/`RoleGate`/`Can` como componentes reutilizáveis (§6.3)
  — a filtragem de navegação usa `usePermission`/`useAnyPermission`
  diretamente (ver [06-shell-navigation.md](06-shell-navigation.md)); os
  componentes wrapper ficam para a etapa de Design System restante.

---

**Anterior:** [04-auth.md](04-auth.md) · **Próximo:** [06-shell-navigation.md](06-shell-navigation.md)
