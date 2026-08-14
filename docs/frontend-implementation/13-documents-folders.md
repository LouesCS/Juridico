# 13 — Documents e Folders

## Não implementado

Nenhum código escrito. Backend: módulo Documents/Folders **não
implementado** e nenhum `StoragePort`/adapter S3 existe ainda no backend
— dependência mais pesada entre os módulos pendentes, porque mesmo o
fluxo mockado (presign → `PUT` → confirm) descrito em
`docs/frontend/18-documents-folders.md §18.2` precisará simular o passo 2
via MSW já que não há storage real para apontar.

---

**Anterior:** [12-deadlines-timeline.md](12-deadlines-timeline.md) · **Próximo:** [14-comments-tags.md](14-comments-tags.md)
