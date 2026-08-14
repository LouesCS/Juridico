import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/mocks/server';
import { resetTeamMocks } from '@/mocks/handlers/team';
import { resetIdentityMocks } from '@/mocks/handlers/identity';
import { resetClientMocks } from '@/mocks/handlers/clients';
import { resetLegalCaseMocks } from '@/mocks/handlers/legal-cases';
import { resetTimelineMocks } from '@/mocks/handlers/timeline';
import { resetDocumentsMocks } from '@/mocks/handlers/documents';
import { resetFoldersMocks } from '@/mocks/handlers/folders';
import { resetAiMocks } from '@/mocks/handlers/ai';
import { resetPermissionsMocks } from '@/mocks/handlers/permissions';
import { resetConfigurationMocks } from '@/mocks/handlers/configuration';
import { resetTaskMocks } from '@/mocks/handlers/tasks';
import { resetPublicationsMocks } from '@/mocks/handlers/publications';
import { resetJudicialMovementMocks } from '@/mocks/handlers/judicial-movements';
import { resetExtrajudicialMovementMocks } from '@/mocks/handlers/extrajudicial-movements';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetTeamMocks();
  resetIdentityMocks();
  resetClientMocks();
  resetLegalCaseMocks();
  resetTimelineMocks();
  resetDocumentsMocks();
  resetFoldersMocks();
  resetAiMocks();
  resetPermissionsMocks();
  resetConfigurationMocks();
  resetTaskMocks();
  resetPublicationsMocks();
  resetJudicialMovementMocks();
  resetExtrajudicialMovementMocks();
  cleanup();
});
afterAll(() => server.close());

// jsdom não implementa ResizeObserver — usado por vários primitivos Radix
// (Checkbox, Select, Popover) para medir dimensão do conteúdo.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom não implementa matchMedia — usado por next-themes/hooks de responsividade.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}

// jsdom não implementa Pointer Events nem scrollIntoView — usados pelo
// Radix Select (`components/ui/select.tsx`) para posicionar o dropdown.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  // jsdom não implementa scrollTo — usado por `AiChat` para rolar até a
  // última mensagem (Sprint 11).
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
}
