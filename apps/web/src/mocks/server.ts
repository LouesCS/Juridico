import { setupServer } from 'msw/node';
import { identityHandlers } from './handlers/identity';
import { teamHandlers } from './handlers/team';
import { permissionsHandlers } from './handlers/permissions';
import { dashboardHandlers } from './handlers/dashboard';
import { clientsHandlers } from './handlers/clients';
import { legalCasesHandlers } from './handlers/legal-cases';
import { deadlinesHandlers } from './handlers/deadlines';
import { timelineHandlers } from './handlers/timeline';
import { documentsHandlers } from './handlers/documents';
import { foldersHandlers } from './handlers/folders';
import { searchHandlers } from './handlers/search';
import { aiHandlers } from './handlers/ai';
import { configurationHandlers } from './handlers/configuration';
import { tasksHandlers } from './handlers/tasks';
import { judicialCaptureHandlers } from './handlers/judicial-capture';
import { publicationsHandlers } from './handlers/publications';
import { judicialMovementsHandlers } from './handlers/judicial-movements';
import { extrajudicialMovementsHandlers } from './handlers/extrajudicial-movements';
import { legalFoldersHandlers } from './handlers/legal-folders';
import { auditHandlers } from './handlers/audit';
import { requestsHandlers } from './handlers/requests';

/**
 * Usado em teste (Vitest/Playwright) — todos os módulos mockados, mesmo
 * Identity/Offices/Memberships/Clients/LegalCases/Deadlines/Timeline/
 * Documents/Folders/Tasks reais (teste não deve depender de backend real).
 * Reafirma docs/frontend/28-mocks.md §28.1.
 */
export const server = setupServer(
  ...identityHandlers,
  ...teamHandlers,
  ...permissionsHandlers,
  ...dashboardHandlers,
  ...clientsHandlers,
  ...legalCasesHandlers,
  ...deadlinesHandlers,
  ...timelineHandlers,
  ...documentsHandlers,
  ...foldersHandlers,
  ...searchHandlers,
  ...aiHandlers,
  ...configurationHandlers,
  ...tasksHandlers,
  ...judicialCaptureHandlers,
  ...publicationsHandlers,
  ...judicialMovementsHandlers,
  ...extrajudicialMovementsHandlers,
  ...legalFoldersHandlers,
  ...auditHandlers,
  ...requestsHandlers,
);
