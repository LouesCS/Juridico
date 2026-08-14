# 18 — Documentos e Pastas

Reafirma `docs/ux/07-documentos.md` e `docs/api/10-documents.md`.
Backend: módulo **Documents/Folders não implementado**, e nenhum
`StoragePort`/adapter S3 existe ainda no backend
(`docs/backend-implementation/00-status.md`) — dependência mais pesada
entre as nove features mockadas, porque sem adapter de storage real nem
mesmo o passo 2 do fluxo abaixo (`PUT` direto ao storage) é testável
ponta a ponta; MSW simula os três passos completos até lá (ver
[28-mocks.md §28.3](28-mocks.md)).

## 18.1 Estrutura

```
features/documents/
├── api/{keys,queries,mutations,upload.ts}
├── components/{document-card,file-card,file-preview,dropzone,version-history}.tsx
└── index.ts

features/folders/
├── api/{keys,queries,mutations}.ts
├── components/{folder-tree,folder-breadcrumb}.tsx
└── index.ts
```

Duas features porque o backend também as trata como recursos distintos
(`docs/api/10-documents.md` define endpoints de pasta separados dos de
documento) — `documents` referencia `folders` só via `index.ts`.

## 18.2 Fluxo de upload — implementação exata

```
1. useRequestUpload() → POST /documents/presign
     { nomeArquivo, mimeType, tamanhoBytes, processoId?, pastaId? }
     → { documentoId, uploadUrl, expiraEm }
2. uploadToSignedUrl(uploadUrl, file, onProgress)   // lib/api/upload.ts, XMLHttpRequest, PUT direto ao storage
     — NÃO passa pelo cliente HTTP central (08-http-client.md §8.5);
       progresso por arquivo alimenta o estado do FileCard individual
3. useConfirmUpload() → POST /documents/:id/confirm { hashSha256 }
     hash calculado client-side (Web Crypto SubtleCrypto.digest('SHA-256', ...))
     antes do passo 2, para comparar com o que o passo 3 envia
4. Documento entra em `statusProcessamento=PENDENTE` — UI escuta atualização
   via SSE de notificação (documento processado) ou poll de fallback
   a cada 5s enquanto a aba está com o documento aberto (ver 20-notifications-sse.md §20.5)
```

Upload múltiplo (10 arquivos de uma vez): cada arquivo percorre os passos
1-3 **independentemente** — uma falha no passo 2 de um arquivo específico
mostra erro só naquele `FileCard` (mensagem exata do backend: "Este
arquivo tem mais de 100 MB..." / "Não aceitamos arquivos .exe...",
reafirma `docs/ux/14-ux-writing.md`), sem cancelar os outros nove
(reafirma `docs/ux/07-documentos.md`: "uma falha nunca cancela o resto").

## 18.3 Preview e download

`FilePreview` abre direto de uma URL assinada (`GET
/documents/:id/preview`), nunca baixa o arquivo inteiro antes de
renderizar. `GET /documents/:id/download` gera uma nova URL assinada de
curta duração **a cada clique** em "Baixar" (nunca reutiliza uma URL
anterior armazenada em estado) — reafirma
`docs/api/10-documents.md §10.1` e [25-security.md §25.6](25-security.md).
Documento com `statusAntivirus=INFECTADO`: botão "Baixar" é substituído
por aviso inline (nunca só desabilitado sem explicação, reafirma
`docs/ux/07-documentos.md`).

## 18.4 Versões

`VersionHistory` — lista cronológica (mais recente primeiro), "Baixar
esta versão" por linha, badge "Vigente" na primeira. Nova versão sempre
via `useUploadNewVersion` (mesmo fluxo de 3 passos do §18.2, endpoint
`POST /documents/:id/versions`) — **nunca** um botão de "sobrescrever"
(reafirma `docs/ux/07-documentos.md`: "nunca um botão de sobrescrita, só
enviar nova versão").

## 18.5 Pastas

`FolderTree` — árvore colapsável, drag-and-drop de documento para pasta
com **alternativa por teclado/menu obrigatória** ("Mover para pasta..."
no menu "⋮" de cada `DocumentCard`, reafirma
[24-accessibility.md §24.2](24-accessibility.md): "nenhuma funcionalidade
depende só de mouse/arraste"). Profundidade máxima 6 níveis — UI esconde
"Nova subpasta" no limite com tooltip explicativo, checagem feita
client-side a partir da profundidade já presente no dado da pasta (não
uma nova chamada de rede só para validar o limite antes de tentar criar).

## 18.6 Confidencialidade

`Documento.confidencialidade = CONFIDENCIAL` sem `document:read:confidential`
(ou escopo equivalente): card **permanece na listagem** (título visível,
preserva contagem — decisão de UX já registrada, distinta da regra geral
de 404 total usada em Processos), clique abre `EmptyState` "Acesso
restrito" em vez do preview — reafirma
[06-autorizacao.md §6.4](06-autorizacao.md).

---

**Anterior:** [17-deadlines-timeline.md](17-deadlines-timeline.md) · **Próximo:** [19-comments-tags.md](19-comments-tags.md)
