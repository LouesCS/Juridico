/**
 * PUT do binário direto para a URL assinada (S3 ou storage local de
 * dev/teste) — nunca passa por `apiClient`/`NEXT_PUBLIC_API_URL`, reafirma
 * docs/api/10-documents.md §10.1 ("o binário nunca trafega pela API").
 * Usa `XMLHttpRequest` (não `fetch`) porque só XHR expõe progresso real de
 * upload via `upload.onprogress` — necessário para a barra de progresso e
 * para permitir cancelar (`xhr.abort()`) pedidos pela Sprint 09.
 */
export interface UploadHandle {
  promise: Promise<void>;
  cancel: () => void;
}

export function uploadFileToStorage(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void,
): UploadHandle {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Falha no upload (status ${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error('Falha de rede durante o upload.'));
    xhr.onabort = () => reject(new Error('Upload cancelado.'));

    xhr.send(file);
  });

  return { promise, cancel: () => xhr.abort() };
}

/** Reafirma docs/database/05-entidades-documentos-colaboracao.md §5.3 — hash calculado no cliente, validado no servidor. */
export async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
