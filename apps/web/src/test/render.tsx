import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Reafirma docs/frontend/27-tests.md §27.3 — nenhum teste monta um
 * componente sem os providers reais que ele espera em produção. Um
 * QueryClient novo por teste (retry desligado, evita esperar timers reais
 * em teste de erro).
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(createTestQueryClient);
  return (
    <NuqsTestingAdapter hasMemory>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </NuqsTestingAdapter>
  );
}

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
