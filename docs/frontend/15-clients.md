# 15 — Clientes

Reafirma `docs/ux/08-clientes.md`. Backend: módulo **Clients não
implementado** — arquitetura descrita contra o contrato
`docs/api/08-clients.md`, integração real pendente (ver
[31-decisions.md §31.1](31-decisions.md)).

## 15.1 Queries e mutations

```
features/clients/api/
├── keys.ts        → clientsKeys.all/list/detail(officeId, ...)
├── queries.ts      → useClients(filters), useClient(id), useClientCases(id), useClientDocuments(id)
└── mutations.ts    → useCreateClient, useUpdateClient, useDeleteClient
```

`useClients` usa `useInfiniteQuery` (cursor). `useClient(id)` popula o
perfil completo — abas (Visão Geral/Processos/Documentos/Contato/
Histórico) são `Suspense` boundaries independentes sobre a mesma query
base, cada uma completando o dado com sua própria sub-query
(`useClientCases`, `useClientDocuments`) só quando a aba é ativada
(`enabled: activeTab === 'processos'`) — evita seis chamadas simultâneas
para um perfil que abre sempre na primeira aba.

## 15.2 Componentes específicos

`ClientCard` (lista/grid), `ClientPicker` (reutilizado por Legal Cases e
Documents — mora em `components/forms/`, não em `features/clients/`,
reafirma [02-estrutura-pastas.md §2.4](02-estrutura-pastas.md)), aviso de
duplicidade (banner inline, não modal — ver
[12-formularios.md §12.3](12-formularios.md)).

## 15.3 Permissão e escopo

`client:read`/`client:create`/`client:update`/`client:delete`. Estagiário
só enxerga clientes vinculados a processos atribuídos a ele — esse
recorte é feito pelo backend na própria listagem (o frontend não aplica
um segundo filtro por papel).

## 15.4 Estados

Empty (nenhum cliente) → `EmptyState` primeiro-uso; exclusão é soft-delete
com opção de restauração (tela de "Lixeira" fica fora do escopo do MVP até
o backend confirmar o endpoint de restauração de cliente especificamente
— `DELETE /clients/:id` existe, "restauração" não está listada em
`docs/api/08-clients.md` e é tratada como pendência, ver
[31-decisions.md §31.7](31-decisions.md)).

---

**Anterior:** [14-dashboard.md](14-dashboard.md) · **Próximo:** [16-legal-cases.md](16-legal-cases.md)
