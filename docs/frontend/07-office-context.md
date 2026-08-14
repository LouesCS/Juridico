# 07 — Contexto de Escritório (Troca de Tenant)

## 7.1 Onde vive o escritório ativo

A **fonte de verdade** do escritório ativo é a claim `tenantId` dentro do
`access_token` (cookie httpOnly, nunca lido pelo frontend). O frontend
mantém um **espelho** em `stores/office.store.ts` (Zustand), populado a
partir de `GET /me` (que retorna `escritorioAtivoId` e a lista de
escritórios do usuário) — nunca o contrário. Nenhum componente decide qual
é o escritório ativo por conta própria; todos leem do store, que é
atualizado só em resposta ao que a API confirma.

## 7.2 Seletor de escritório

Componente `WorkspaceSwitcher` na Topbar (dropdown se houver >1
escritório vinculado ativo — reafirma `docs/ux/04-navigation.md` modal
"Selecionar Escritório"). Lista vem de `useCurrentUser().escritorios`
(já carregada, sem nova chamada de rede para abrir o seletor).

## 7.3 Fluxo de troca — sequência exata

```
1. Usuário seleciona outro escritório no WorkspaceSwitcher
2. POST /auth/switch-office { escritorioId }
   → backend invalida a sessão/tokens antigos e emite novos
     (novo tenantId/roles/permissions), reafirma docs/api/02-autenticacao.md §2.7
3. Sucesso:
   a. queryClient.clear()               — nenhuma query do escritório anterior sobrevive
   b. office.store atualizado           — novo escritorioAtivoId
   c. invalidate(['me'])                — recarrega permissões/roles
   d. SSE: fecha conexão anterior, abre nova apontando para o novo tenant
      (a própria conexão é escopada por tenant no backend, mas o cliente
      precisa reabrir porque o EventSource não migra sozinho)
   e. BroadcastChannel('quilombo-auth') publica 'office-switched'
      → outras abas também fazem (a) a (d)
   f. Redireciona para `/` (Dashboard) — nunca mantém a rota anterior,
      porque um processo/documento específico da rota atual quase
      certamente não existe no novo escritório
4. Falha (403 NOT_A_MEMBER — vínculo removido entre o carregamento da
   lista e o clique): toast de erro, permanece no escritório atual,
   remove o escritório da lista local sem nova chamada de rede
```

## 7.4 Por que `queryClient.clear()` inteiro, não invalidação seletiva

Decisão deliberada, não preguiça: uma troca de escritório muda o
significado de **toda** query, porque cada uma é implicitamente escopada
pelo tenant do token com que foi feita. Invalidar seletivamente exigiria
enumerar exaustivamente toda chave existente — um esquecimento é dado de
um tenant vazando visualmente no outro, ainda que por um instante, até
refetch. `clear()` é o único jeito de eliminar esse risco por construção.
Isso reforça, e não substitui, a decisão de escopar toda chave por
`officeId` (ver [10-tanstack-query.md §10.2](10-tanstack-query.md)) — as
duas mitigações são independentes e cumulativas.

## 7.5 SSE e troca de escritório

Conexão SSE (notificações, resumo de IA em andamento) é sempre **uma
conexão por sessão × escritório ativo** (reafirma
`docs/ux/11-notificacoes.md` + decisão de auth SSE em
`docs/api/02-autenticacao.md §2.9`). Trocar de escritório com uma geração
de IA em andamento no escritório anterior: a stream é fechada (o
componente que a exibia já não é renderizado, porque a navegação para `/`
desmontou a árvore do processo); a geração em si **continua no backend** —
o usuário a encontra em "Histórico" ao voltar para aquele escritório mais
tarde. Nenhuma tentativa de "pausar e retomar" client-side.

## 7.6 Casos de borda

| Caso | Comportamento |
|---|---|
| Escritório removido enquanto navegando nele | Próxima chamada de API retorna `403 NOT_A_MEMBER` ou `404` (a depender do endpoint) → tratado como erro de autorização padrão, `PermissionGate`/`error.tsx` — usuário é levado de volta para o seletor de escritório se ainda tiver outro vínculo ativo, ou para uma tela "sem escritório ativo" com opção de criar um novo (mesmo fluxo de `/registro`) se não tiver mais nenhum |
| Vínculo revogado (removido pelo Owner) | Idêntico ao caso acima — o frontend não distingue "removido" de "nunca existiu", mesma lógica de não revelar detalhe de autorização (§6.4) |
| Usuário com um único escritório | `WorkspaceSwitcher` não aparece como dropdown — nome do escritório é só texto na Topbar, sem affordance de troca |
| Deep link para rota que exige outro escritório ativo (ex.: link de notificação de um processo em outro tenant) | Reafirma `docs/ux/04-navigation.md §4.10`: prompt de troca de escritório antes de renderizar a rota, nunca renderiza parcialmente primeiro |

## 7.7 Persistência segura

Nenhuma persistência client-side do escritório ativo além do que o backend
já garante via `Sessao.escritorioAtivoId` (refletido no `access_token` a
cada refresh). O Zustand `office.store` **não** é persistido em
`localStorage` (diferente de preferências puramente visuais como tema —
ver [11-estado-global.md §11.2](11-estado-global.md)) — ao abrir uma nova
aba/sessão, o escritório ativo vem sempre de `GET /me`, nunca de um valor
local potencialmente desatualizado.

---

**Anterior:** [06-autorizacao.md](06-autorizacao.md) · **Próximo:** [08-http-client.md](08-http-client.md)
