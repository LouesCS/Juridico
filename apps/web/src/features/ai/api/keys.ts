import type { EscopoResumoIA } from './ai.api';

export const aiKeys = {
  all: (officeId: string) => ['office', officeId, 'ai'] as const,
  summaries: (officeId: string, escopoTipo: EscopoResumoIA, escopoId: string) =>
    [...aiKeys.all(officeId), 'summaries', escopoTipo, escopoId] as const,
  summary: (officeId: string, id: string) => [...aiKeys.all(officeId), 'summary', id] as const,
  sources: (officeId: string, id: string) => [...aiKeys.all(officeId), 'sources', id] as const,
  insights: (officeId: string) => [...aiKeys.all(officeId), 'insights'] as const,
  usage: (officeId: string) => [...aiKeys.all(officeId), 'usage'] as const,
};
