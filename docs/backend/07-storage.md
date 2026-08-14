# 07 — Storage

> Reafirma [../05-arquitetura-backend.md](../05-arquitetura-backend.md) e
> fluxo de upload de [../api/10-documents.md §10.1](../api/10-documents.md).

## 7.1 Abstração — port/adapter

```
shared/infrastructure/storage/
├── storage.port.ts
├── storage.module.ts
└── adapters/
    ├── s3.adapter.ts          # produção — qualquer S3-compatible (AWS S3, R2, MinIO)
    └── local.adapter.ts       # desenvolvimento local (filesystem, via Docker volume)
```

```
interface StoragePort {
  presignUpload(key: string, mimeType: string, expiresInSeconds: number): Promise<{ url: string; expiraEm: Date }>;
  presignDownload(key: string, expiresInSeconds: number): Promise<{ url: string; expiraEm: Date }>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

Nenhum use case de `Documents` conhece AWS SDK ou qualquer detalhe de
provedor — apenas `StoragePort`, injetado por `StorageModule` conforme
`STORAGE_PROVIDER` (`s3`\|`local`) validado em `env.schema.ts`.

## 7.2 S3-compatible (produção)

Bucket privado (sem acesso público em nenhuma hipótese, reafirma
[../09-seguranca-lgpd.md §9.4](../09-seguranca-lgpd.md)), versionamento de
bucket habilitado (defesa adicional além do versionamento de aplicação em
`VersaoDocumento`), lifecycle policy alinhada à retenção de
[../database/10-soft-delete-retencao-lgpd.md §10.4](../database/10-soft-delete-retencao-lgpd.md).

## 7.3 Local (desenvolvimento)

`LocalAdapter` grava em volume Docker (`./storage-data`, ver
[12-docker.md](12-docker.md)) e serve URLs assinadas via um endpoint
interno de desenvolvimento que simula expiração — nunca usado em produção
(`env.schema.ts` rejeita `STORAGE_PROVIDER=local` se `NODE_ENV=production`).

## 7.4 URLs assinadas

`presignUpload`/`presignDownload` geram URL com TTL curto (upload: 5 min;
download: 5 min, reafirma
[../api/10-documents.md §10.5](../api/10-documents.md)) — `StoragePort` não
decide o TTL (isso é regra de negócio do use case chamador), apenas recebe o
valor e delega ao SDK do provedor.

## 7.5 Versionamento

Cada `VersaoDocumento` tem `storageKey` própria (nunca reaproveita a key da
versão anterior) — reafirma
[../database/05-entidades-documentos-colaboracao.md §5.4](../database/05-entidades-documentos-colaboracao.md).
`StoragePort` não tem conceito de "versão" — é responsabilidade inteiramente
do domínio de `Documents`; storage só armazena objetos por chave.

## 7.6 Antivírus

Job assíncrono (fila `documents`, ver [09-filas.md](09-filas.md)) chama um
adapter de antivírus (`shared/infrastructure/storage/antivirus.port.ts`,
ex.: ClamAV via sidecar ou serviço gerenciado) — mesmo padrão port/adapter,
resultado grava `Documento.statusAntivirus`.

---

**Anterior:** [06-autorizacao.md](06-autorizacao.md) · **Próximo:** [08-cache.md](08-cache.md)
