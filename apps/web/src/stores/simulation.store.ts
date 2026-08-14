import { create } from 'zustand';

/**
 * "Simulador" (Permission Engine, Prompt 12 §Simulador) — estado do membro
 * sendo simulado, se houver. Deliberadamente SEM `persist` (diferente de
 * `ui.store.ts`): simular outra pessoa é sensível o bastante para nunca
 * sobreviver a um F5 sem intenção explícita — um recarregamento de página
 * sempre volta a mostrar o usuário real.
 *
 * `lib/api/client.ts` lê `useSimulationStore.getState().simulatingMembroId`
 * (fora de componente React) para anexar o header `X-Simulate-Membro-Id`
 * em toda requisição — o backend (`SimulationGuard`) é quem de fato decide
 * se a simulação é válida; este store só guarda a intenção do OWNER e o
 * rótulo pra exibir no banner.
 */
interface SimulationState {
  simulatingMembroId: string | null;
  simulatingLabel: string | null;
  start: (membroId: string, label: string) => void;
  stop: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  simulatingMembroId: null,
  simulatingLabel: null,
  start: (membroId, label) => set({ simulatingMembroId: membroId, simulatingLabel: label }),
  stop: () => set({ simulatingMembroId: null, simulatingLabel: null }),
}));
