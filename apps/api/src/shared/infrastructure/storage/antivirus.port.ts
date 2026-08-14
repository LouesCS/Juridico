/**
 * Reafirma docs/backend/07-storage.md §7.6 — mesmo padrão port/adapter do
 * storage. Pipeline assíncrono real (fila `documents` via BullMQ + ClamAV)
 * fica para quando filas existirem no projeto (docs/backend-implementation/00-status.md
 * lista "Filas (BullMQ)" como não implementado). Nesta rodada, o resultado é
 * calculado de forma síncrona logo após a confirmação do upload, pelo
 * `FakeCleanAntivirusAdapter` — mesmo racional de `AI_PROVIDER=fake`: um
 * adapter real (não hardcode de dado), só que sempre "limpo", documentado
 * como pendência explícita de scanner real.
 */
export const ANTIVIRUS_PORT = Symbol('ANTIVIRUS_PORT');

export type AntivirusScanResult = 'LIMPO' | 'INFECTADO' | 'ERRO';

export interface AntivirusPort {
  scan(storageKey: string): Promise<AntivirusScanResult>;
}
