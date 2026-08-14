# 18 — Docker e CI

## Docker

`Dockerfile` (multi-stage: deps → build → production, usuário não-root) e
`docker-compose.yml` (postgres, redis, minio, mailpit, api) escritos em
`apps/api/`. **Sintaxe YAML validada de fato** (parseada com a biblioteca
`yaml`, instalada temporariamente só para essa verificação e removida em
seguida — não ficou como dependência do projeto).

**Não verificado:** build da imagem Docker, subida real dos containers,
conectividade entre serviços — nenhum Docker Engine disponível neste
ambiente. O serviço `worker` está comentado no compose porque o entrypoint
`dist/src/jobs/main.js` ainda não existe (nenhuma fila foi implementada).

## CI

**Não implementado nesta rodada.** Nenhum arquivo de pipeline (GitHub
Actions ou equivalente) foi criado. A sequência que o pipeline deveria
executar (reafirma `docs/backend/11-testes.md §11.4` e
`docs/api/19-openapi.md §19.9`) já rodou **manualmente** nesta etapa como
verificação:

```
npm install → prisma validate → prisma generate → tsc --noEmit → eslint → nest build → jest
```

Todas as etapas acima passaram neste ambiente. O que falta para virar CI de
fato: arquivo de workflow, gate de `oasdiff`, contract testing, subida de
Postgres/Redis efêmeros no runner.

---

**Anterior:** [17-tests.md](17-tests.md) · **Próximo:** [19-decisions.md](19-decisions.md)
