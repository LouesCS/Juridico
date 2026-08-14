# 20 — Docker e CI

## Docker

`Dockerfile` (multi-stage: deps → build → production, usuário não-root,
mesmo padrão de `apps/api/Dockerfile`) escrito em `apps/web/`.
`next.config.ts` recebeu `output: 'standalone'` — pré-requisito para este
padrão de Dockerfile (copia só o output mínimo, sem `node_modules`
completo).

**Verificado de fato:** `npx next build` com `output: 'standalone'` gera
`.next/standalone/` com `server.js` + `node_modules` mínimo + `package.json`
— confirmado via `ls`. **Não verificado:** build da imagem Docker em si,
subida do container — sem Docker Engine neste ambiente (mesma limitação
já documentada para `apps/api/`).

Não adicionado ao `docker-compose.yml` já existente em `apps/api/` —
fora do escopo desta etapa (envolveria decidir se os dois apps passam a
compartilhar um compose único, decisão de infraestrutura não pedida
explicitamente aqui).

## CI

**Não implementado nesta rodada.** Nenhum arquivo de pipeline foi criado.
A sequência que o pipeline deveria executar (reafirma
`docs/frontend/30-ci.md`) já rodou **manualmente** nesta etapa como
verificação:

```
npm install → tsc --noEmit → eslint → prettier --check → vitest run → next build
```

Todas as etapas acima passaram neste ambiente. O que falta para virar CI
de fato: arquivo de workflow, geração de tipos OpenAPI real (depende de
[19-decisions.md §19.2](19-decisions.md)), Playwright, axe-core, análise
de bundle automatizada, scan de dependências/secrets.

---

**Anterior:** [19-decisions.md](19-decisions.md) · **Próximo:** [21-context-next-step.md](21-context-next-step.md)
