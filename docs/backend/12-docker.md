# 12 — Docker e Docker Compose

## 12.1 Serviços (desenvolvimento local)

```yaml
services:
  api:
    build: ./apps/api
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [postgres, redis, minio, mailhog]

  worker:
    build: ./apps/api           # mesma imagem, entrypoint diferente
    command: node dist/jobs/main.js
    env_file: .env
    depends_on: [postgres, redis, minio]

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: quilombo_dev
    volumes: ["pgdata:/var/lib/postgresql/data"]
    ports: ["5432:5432"]

  redis:
    image: redis:7
    volumes: ["redisdata:/data"]
    ports: ["6379:6379"]

  minio:                         # S3-compatible local (adapter s3.adapter.ts aponta aqui em dev)
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes: ["storage-data:/data"]
    ports: ["9000:9000", "9001:9001"]

  mailhog:                       # captura e-mail local (SmtpAdapter aponta aqui em dev)
    image: mailhog/mailhog
    ports: ["1025:1025", "8025:8025"]

  web:
    build: ./apps/web
    ports: ["3001:3000"]
    depends_on: [api]

volumes:
  pgdata:
  redisdata:
  storage-data:

networks:
  default:
    name: quilombo-dev-network
```

## 12.2 Containers e responsabilidade

| Container | Papel |
|---|---|
| `api` | Processo HTTP principal (Controllers, guards, SSE) |
| `worker` | Processos BullMQ — mesma imagem/código-fonte de `api`, entrypoint diferente (reafirma [../05-arquitetura-backend.md §5.8](../05-arquitetura-backend.md), "workers rodam como processo separado com a mesma base de código") |
| `postgres` | Banco transacional |
| `redis` | Cache + broker BullMQ |
| `minio` | Storage S3-compatible local, para `S3Adapter` funcionar em desenvolvimento sem depender de nuvem |
| `mailhog` | Captura visual de e-mail local, para `SmtpAdapter` (reafirma [02-modulos.md §2.17](02-modulos.md)) |
| `web` | Frontend Next.js (documentado em [../04-arquitetura-frontend.md](../04-arquitetura-frontend.md), incluído aqui só para o Compose subir o ambiente completo) |

## 12.3 Volumes

`pgdata`, `redisdata`, `storage-data` — nomeados e persistentes entre
`docker compose down`/`up` (dado de desenvolvimento não é descartado a cada
reinício); `docker compose down -v` explícito para reset completo.

## 12.4 Redes

Uma única rede bridge nomeada (`quilombo-dev-network`) — todos os serviços
se resolvem por nome de container (`postgres`, `redis`, `minio`), nunca por
IP fixo.

## 12.5 Variáveis de ambiente por serviço

`.env` único na raiz, consumido por `api` e `worker` — validado por
`env.schema.ts` (Zod) no boot de ambos; `.env.example` versionado com todas
as chaves documentadas (sem valor real). Diferença entre `api` e `worker`
apenas no `command`/entrypoint, nunca no schema de configuração (o mesmo
`env.schema.ts` vale para os dois processos).

## 12.6 Produção

Docker Compose descrito acima é **desenvolvimento local apenas**. Produção
usa orquestração gerenciada (ECS/Cloud Run/Fly.io, conforme já decidido em
[../10-roadmap-e-decisoes.md §10.1](../10-roadmap-e-decisoes.md)) com
`postgres`/`redis` gerenciados (não em container próprio) e `minio`
substituído pelo S3/R2 real — a mesma imagem Docker de `api`/`worker` é
usada em todos os ambientes, apenas a configuração (`env`) muda.

---

**Anterior:** [11-testes.md](11-testes.md) · **Próximo:** [13-decisoes.md](13-decisoes.md)
