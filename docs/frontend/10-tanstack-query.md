# 10 — TanStack Query (Estado Remoto)

## 10.1 Configuração do `QueryClient` (reafirma `docs/04` §4.3, sem mudança)

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s
      gcTime: 5 * 60_000,          // 5min
      retry: (failureCount, error) =>
        isNetworkOrServerError(error) && failureCount < 2, // nunca em 4xx
      refetchOnWindowFocus: true,  // advogado deixa a aba aberta o dia todo
    },
    mutations: {
      retry: 0,                    // mutation nunca reexecuta sozinha (efeito colateral)
    },
  },
});
```

`QueryProvider` (`src/providers/query-provider.tsx`) instancia **um**
`QueryClient` por sessão de browser (não por render — `useState` lazy
initializer no provider, padrão oficial do TanStack Query para App
Router).

## 10.2 Convenção de chaves — decisão corrigida em relação a `docs/04`

`docs/04-arquitetura-frontend.md §4.3` propôs chaves como
`['processos', 'lista', filtros]`, **sem** `officeId`. Correção registrada
formalmente em [31-decisions.md §31.2](31-decisions.md): **toda chave é
prefixada por `['office', officeId, ...]`**, sem exceção:

```
['office', officeId]                                    → GET /me (parte do escopo do escritório)
['office', officeId, 'legal-cases']
['office', officeId, 'legal-cases', 'list', filters]
['office', officeId, 'legal-cases', 'detail', caseId]
['office', officeId, 'legal-cases', 'detail', caseId, 'timeline']
['office', officeId, 'clients', 'list', filters]
['office', officeId, 'notifications', 'unread-count']
```

**Por quê isto não é opcional:** sem `officeId` na chave, um
`queryClient.clear()` na troca de escritório (§7.4) ainda seria a rede de
segurança correta, mas qualquer chamada que aconteça **entre** o clique de
troca e o `clear()` completar (ex.: um `refetchOnWindowFocus` disparado
por uma race de foco de janela) escreveria dado do escritório novo sob uma
chave que uma query ainda montada do escritório antigo poderia ler
imediatamente depois, e vice-versa. Escopar por `officeId` torna essa
janela de risco irrelevante: a chave do escritório B nunca colide com a
do escritório A, então não há necessidade de que o `clear()` seja
perfeitamente atômico com a navegação. As duas mitigações (chave escopada
+ `clear()` no switch) são independentes e cumulativas — nenhuma
substitui a outra.

Implementado como factory por feature (`features/<dominio>/api/keys.ts`):

```ts
export const legalCasesKeys = {
  all: (officeId: string) => ['office', officeId, 'legal-cases'] as const,
  list: (officeId: string, filters: LegalCaseFilters) =>
    [...legalCasesKeys.all(officeId), 'list', filters] as const,
  detail: (officeId: string, caseId: string) =>
    [...legalCasesKeys.all(officeId), 'detail', caseId] as const,
};
```

`officeId` vem sempre de `useCurrentOffice()` (lê `stores/office.store.ts`,
§7.1) dentro do próprio hook de query — nunca passado manualmente pelo
componente chamador, para eliminar a chance de um componente esquecer de
atualizar o `officeId` usado numa chave após uma troca.

## 10.3 Invalidação

Hierárquica por prefixo — invalidar `legalCasesKeys.all(officeId)` invalida
toda lista e todo detalhe daquele escritório. Toda mutation invalida
explicitamente (nunca "invalida tudo" como atalho): criar processo invalida
`legal-cases.all`; associar tag invalida `legal-cases.detail(id)` **e**
`tags.all` (a lista de tags mostra contagem de uso).

## 10.4 Optimistic updates e rollback

Reservado a interações onde a latência percebida importa mais que a
garantia de consistência imediata — lista fechada, não um padrão
aplicado indiscriminadamente: marcar notificação como lida, concluir
prazo (checkbox inline), 👍/👎 em resumo de IA, favoritar item de busca.
Padrão:

```ts
onMutate: async (vars) => {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, optimisticUpdate(vars));
  return { previous };
},
onError: (_err, _vars, context) => {
  queryClient.setQueryData(queryKey, context.previous); // rollback
},
onSettled: () => queryClient.invalidateQueries({ queryKey }),
```

Ações destrutivas (excluir, arquivar) e qualquer escrita com efeito
jurídico (criar processo, enviar documento) **não** são otimistas — o
usuário espera a confirmação real do servidor, reafirma
`docs/ux/01-design-principles.md` (reversibilidade via soft-delete não é
desculpa para mentir sobre o estado atual).

## 10.5 Paginação por cursor e `useInfiniteQuery`

Todas as listagens de volume (Processos, Documentos, Timeline,
Notificações, Auditoria) usam `useInfiniteQuery` com `getNextPageParam`
lendo `pagination.nextCursor` da resposta (reafirma
`docs/api/01-convencoes.md`). Nenhuma lista de volume usa `page`/`offset`.
Telas administrativas de baixo volume (papéis, permissões) usam
`useQuery` simples com `page`/`pageSize`, exceção já documentada no
próprio contrato de API.

## 10.6 Prefetch

Hover em link de processo/documento (`Link` do Next.js + `onMouseEnter`)
dispara `queryClient.prefetchQuery` para a chave de detalhe — mesma
técnica descrita em `docs/ux/09-busca-global.md §9.13` para resultado de
busca.

## 10.7 SSR e hidratação

Server Component de uma rota de listagem/detalhe busca o dado inicial
(usando o cookie do request, ver [05-autenticacao.md §5.3](05-autenticacao.md))
e o serializa via `dehydrate`/`<HydrationBoundary>` — o Client Component
correspondente monta já com o cache preenchido, sem segundo fetch no
primeiro paint. `officeId` usado na chave do lado servidor vem do `GET
/me` já resolvido nesse mesmo request (nunca de um cookie de tenant
separado — não existe tal cookie, reafirma §7.1).

## 10.8 Limpeza de cache

Coberto em detalhe em [07-office-context.md §7.4](07-office-context.md)
(troca de escritório) e [05-autenticacao.md §5.4](05-autenticacao.md)
(logout) — ambos usam `queryClient.clear()` completo, não invalidação
seletiva, pelas razões já registradas nesses documentos.

---

**Anterior:** [09-openapi.md](09-openapi.md) · **Próximo:** [11-estado-global.md](11-estado-global.md)
