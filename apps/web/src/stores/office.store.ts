import { create } from 'zustand';

/**
 * Espelho do escritório ativo — reafirma docs/frontend/07-office-context.md
 * §7.1/§7.7. Nunca persistido (`localStorage`/`sessionStorage`); a fonte de
 * verdade continua sendo a claim `tenantId` do `access_token` (cookie
 * httpOnly), refletida aqui só depois que `GET /me` ou
 * `POST /auth/switch-office` confirmam.
 *
 * Limitação real registrada em
 * docs/frontend-implementation/19-decisions.md §19.8: só `POST /auth/login`
 * retorna a lista completa de escritórios do usuário (`escritorios[]`);
 * `GET /me` retorna apenas o escritório ativo. Por isso `escritorios` pode
 * conter um único item (o ativo) quando a sessão foi retomada por cookie
 * (reload) sem passar por um login nesta aba — o `WorkspaceSwitcher`
 * degrada corretamente para o caso "um único escritório" (§7.6) nesse
 * cenário, em vez de inventar dados.
 */
export interface OfficeSummary {
  id: string;
  nome: string;
  papel: string;
}

/**
 * `no-office` cobre só o caso detectável nesta rodada: `GET /me` resolve
 * mas `escritorio.id` vem vazio (todos os vínculos removidos antes do
 * boot). Um vínculo revogado **durante** a navegação (ex.: Owner remove o
 * usuário enquanto ele já está com a sessão aberta) exigiria checagem
 * genérica de 403 em qualquer chamada — o cliente HTTP hoje só trata 401
 * (`docs/frontend-implementation/03-http-openapi.md`); estender isso é
 * pendência explícita, registrada em
 * docs/frontend-implementation/19-decisions.md §19.8, não implementada
 * aqui para não introduzir um estado que nada popula de fato.
 */
export type OfficeStatus = 'idle' | 'ready' | 'no-office';

interface OfficeState {
  status: OfficeStatus;
  escritorioAtivoId: string | null;
  escritorios: OfficeSummary[];
  hydrateFromLogin: (escritorioAtivoId: string, escritorios: OfficeSummary[]) => void;
  hydrateFromMe: (escritorio: { id?: string; nome?: string } | undefined, papel?: string) => void;
  setActive: (escritorioId: string) => void;
  removeOffice: (escritorioId: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as OfficeStatus,
  escritorioAtivoId: null as string | null,
  escritorios: [] as OfficeSummary[],
};

export const useOfficeStore = create<OfficeState>((set, get) => ({
  ...initialState,

  hydrateFromLogin: (escritorioAtivoId, escritorios) =>
    set({ status: 'ready', escritorioAtivoId, escritorios }),

  hydrateFromMe: (escritorio, papel) => {
    if (!escritorio?.id) {
      set({ status: 'no-office', escritorioAtivoId: null });
      return;
    }
    const { escritorios } = get();
    const known = escritorios.some((o) => o.id === escritorio.id);
    set({
      status: 'ready',
      escritorioAtivoId: escritorio.id,
      escritorios: known
        ? escritorios
        : [...escritorios, { id: escritorio.id, nome: escritorio.nome ?? '', papel: papel ?? '' }],
    });
  },

  setActive: (escritorioId) => set({ status: 'ready', escritorioAtivoId: escritorioId }),

  removeOffice: (escritorioId) =>
    set((state) => ({
      escritorios: state.escritorios.filter((o) => o.id !== escritorioId),
    })),

  reset: () => set(initialState),
}));
