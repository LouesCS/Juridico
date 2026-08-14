# 10 — Documents e Folders *(não implementado nesta rodada)*

Schema pronto (`Documento`, `VersaoDocumento`, `Pasta`). Contrato pronto
(`docs/api/10-documents.md`). `StoragePort` (`docs/backend/07-storage.md`)
**não foi criado** nesta rodada — é pré-requisito deste módulo.

**Primeiro passo da próxima rodada:** implementar `StoragePort` +
`S3Adapter`/`LocalAdapter` (mesmo padrão port/adapter já usado em
`MailPort`, ver `shared/infrastructure/mail/`) antes de qualquer endpoint de
upload — o fluxo de presign/confirm depende inteiramente dele.

---

**Anterior:** [09-deadlines-timeline.md](09-deadlines-timeline.md) · **Próximo:** [11-comments-tags.md](11-comments-tags.md)
