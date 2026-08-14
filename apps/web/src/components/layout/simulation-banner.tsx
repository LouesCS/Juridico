'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '@/stores/simulation.store';

/**
 * Banner persistente durante uma simulação ativa (Permission Engine,
 * Prompt 12 §Simulador) — montado uma vez em `app/(app)/layout.tsx`
 * (visível em toda a aplicação, não só na tela administrativa), para que
 * nunca seja possível esquecer que se está vendo o sistema como outra
 * pessoa.
 */
export function SimulationBanner() {
  const { simulatingMembroId, simulatingLabel, stop } = useSimulationStore();
  const queryClient = useQueryClient();

  if (!simulatingMembroId) return null;

  function handleStop() {
    stop();
    queryClient.clear();
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground">
      <Eye className="size-4" aria-hidden="true" />
      <span>
        Simulando <strong>{simulatingLabel}</strong> — você está vendo o sistema exatamente como este
        membro veria.
      </span>
      <Button variant="secondary" size="sm" onClick={handleStop}>
        Sair da simulação
      </Button>
    </div>
  );
}
