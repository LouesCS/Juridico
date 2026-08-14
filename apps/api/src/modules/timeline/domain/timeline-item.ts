/**
 * Forma comum de um item de timeline depois do merge entre `EventoTimeline`
 * real e a projeção somente-leitura de `Prazo` (reafirma docs/api/11-timeline.md
 * §11.1 — eventos `PRAZO` nunca são gravados como `EventoTimeline`, só
 * projetados na leitura).
 */
export interface TimelineItem {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  dataEvento: Date;
  origem: string;
  autor: { id: string; nome: string } | null;
  entidadeRelacionada: { tipo: string; id: string } | null;
  fixado: boolean;
  editavel: boolean;
}
