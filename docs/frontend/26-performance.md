# 26 — Performance

Reafirma `docs/04-arquitetura-frontend.md §4.7` integralmente — nenhum
orçamento ou técnica é redecidido aqui, só detalhado.

## 26.1 Orçamento (falha o CI se estourar, reafirma [30-ci.md §30.5](30-ci.md))

LCP < 2,0s · INP < 200ms · CLS < 0,1 · JS inicial < 180 kB gzip. Dashboard
tem o orçamento mais apertado de todo o produto: "visualmente completo em
<1s" (`docs/ux/05-dashboard.md`) — por isso é a única rota que usa
streaming SSR com `Suspense` por bloco desde o primeiro dia (ver
[14-dashboard.md §14.4](14-dashboard.md)), não uma otimização adiada.

## 26.2 Técnicas por situação

| Técnica | Onde |
|---|---|
| Server Components | Toda leitura sem interatividade — reduz JS enviado ao cliente por padrão, reafirma [01-arquitetura.md §1.6](01-arquitetura.md) |
| Streaming + `Suspense` | Dashboard (blocos independentes), Timeline longa |
| `loading.tsx` por rota | Skeleton com a forma real do conteúdo — nunca spinner genérico |
| Virtualização (TanStack Virtual) | Listas >100 itens: Processos, Documentos, Timeline (10 mil+ eventos, requisito de aceitação de `docs/ux/06-processos.md §6.15`) |
| Paginação por cursor | Toda lista de volume — nunca offset (reafirma [10-tanstack-query.md §10.5](10-tanstack-query.md)) |
| Prefetch em hover | Links de processo/documento/resultado de busca |
| `next/image` | Avatares, thumbnails de documento |
| `next/font` | Inter, Source Serif 4, JetBrains Mono — self-hosted, `display: swap`, sem FOUT |
| Code splitting (`dynamic()`) | `FilePreview` (visualizador PDF/Office), `AIPanel` (streaming), qualquer componente que só é necessário em interação específica |
| Debounce | Busca (200ms, [21-search.md §21.2](21-search.md)), autosave (2s, [12-formularios.md §12.4](12-formularios.md)) |

## 26.3 Bundle analysis

`@next/bundle-analyzer` rodado em CI (não bloqueante por si só, mas o
orçamento de 180 kB gzip do JS inicial é); qualquer feature que
adicionar uma dependência pesada (ex.: biblioteca de gráfico para as
métricas do Dashboard) deve carregá-la via `dynamic()` sem SSR, nunca no
bundle inicial.

## 26.4 Web Vitals em produção

Reportados via `useReportWebVitals` (Next.js) para o mesmo pipeline de
observabilidade do restante do frontend — ver
[29-observability.md §29.2](29-observability.md). Não são só uma métrica
de CI: o mesmo orçamento é monitorado contra usuário real, para pegar
regressão que um ambiente de CI sintético não reproduziria (ex.: rede do
escritório mais lenta que a do runner de CI).

## 26.5 O que este documento explicitamente não faz

Reafirma `docs/04 §4.7`: nenhuma otimização prematura que prejudique
manutenção — memoização (`useMemo`/`useCallback`/`React.memo`) só é
aplicada onde profiling real (React DevTools Profiler) mostrou
re-render custoso, nunca como hábito default em todo componente.

---

**Anterior:** [25-security.md](25-security.md) · **Próximo:** [27-tests.md](27-tests.md)
