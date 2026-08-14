import { setupWorker } from 'msw/browser';
import { demoHandlers } from './demo/handlers';

/**
 * Usado em desenvolvimento local (`npm run dev:mock`) — modo demonstração
 * (docs/frontend-implementation/19-decisions.md). Diferente do ambiente de
 * teste (`mocks/server.ts`, que usa as fixtures fixas de `mocks/handlers/*`
 * verificadas pelo Vitest), aqui usamos `mocks/demo/handlers.ts` — dados
 * fictícios "realistas" (escritório "Silva & Associados" etc.) para uma
 * demonstração visual navegável de ponta a ponta.
 *
 * Nesta rodada, `demoHandlers` inclui também Identity/Memberships — uma
 * exceção deliberada e temporária à regra geral de
 * docs/frontend/28-mocks.md §28.1 ("Identity/Offices/Memberships nunca
 * mockados em desenvolvimento"), porque não há Postgres/Docker disponíveis
 * neste ambiente para rodar `apps/api/` de verdade. Fora do modo demo
 * (`NEXT_PUBLIC_API_MOCKING` diferente de `enabled`), este worker nunca é
 * iniciado (`providers/mock-provider.tsx`), então a regra geral continua
 * valendo em qualquer ambiente com backend real disponível.
 */
export const worker = setupWorker(...demoHandlers);
