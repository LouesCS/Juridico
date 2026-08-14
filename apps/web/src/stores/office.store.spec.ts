import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from './office.store';

/**
 * Testes puros da store — sem componente, sem rede. Reafirma
 * docs/frontend/07-office-context.md §7.1/§7.6/§7.7.
 */
describe('office.store', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
  });

  it('começa em idle sem escritório', () => {
    const state = useOfficeStore.getState();
    expect(state.status).toBe('idle');
    expect(state.escritorioAtivoId).toBeNull();
    expect(state.escritorios).toEqual([]);
  });

  it('hydrateFromLogin popula a lista completa (único momento em que ela existe)', () => {
    useOfficeStore
      .getState()
      .hydrateFromLogin('office-1', [
        { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
        { id: 'office-2', nome: 'Escritório B', papel: 'ADVOGADO' },
      ]);

    const state = useOfficeStore.getState();
    expect(state.status).toBe('ready');
    expect(state.escritorioAtivoId).toBe('office-1');
    expect(state.escritorios).toHaveLength(2);
  });

  it('hydrateFromMe sem escritorio.id marca no-office (vínculo revogado/ausente)', () => {
    useOfficeStore.getState().hydrateFromMe(undefined);
    const state = useOfficeStore.getState();
    expect(state.status).toBe('no-office');
    expect(state.escritorioAtivoId).toBeNull();
  });

  it('hydrateFromMe degrada para lista de um único item quando não veio de login (reload)', () => {
    useOfficeStore.getState().hydrateFromMe({ id: 'office-1', nome: 'Escritório A' }, 'OWNER');
    const state = useOfficeStore.getState();
    expect(state.status).toBe('ready');
    expect(state.escritorioAtivoId).toBe('office-1');
    expect(state.escritorios).toEqual([{ id: 'office-1', nome: 'Escritório A', papel: 'OWNER' }]);
  });

  it('hydrateFromMe não duplica um escritório já conhecido', () => {
    useOfficeStore
      .getState()
      .hydrateFromLogin('office-1', [
        { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
        { id: 'office-2', nome: 'Escritório B', papel: 'ADVOGADO' },
      ]);
    useOfficeStore.getState().hydrateFromMe({ id: 'office-1', nome: 'Escritório A' }, 'OWNER');

    expect(useOfficeStore.getState().escritorios).toHaveLength(2);
  });

  it('setActive troca o escritório ativo sem alterar a lista', () => {
    useOfficeStore
      .getState()
      .hydrateFromLogin('office-1', [
        { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
        { id: 'office-2', nome: 'Escritório B', papel: 'ADVOGADO' },
      ]);
    useOfficeStore.getState().setActive('office-2');

    const state = useOfficeStore.getState();
    expect(state.escritorioAtivoId).toBe('office-2');
    expect(state.escritorios).toHaveLength(2);
  });

  it('removeOffice remove o escritório da lista local sem nova chamada de rede (falha 403 no switch)', () => {
    useOfficeStore
      .getState()
      .hydrateFromLogin('office-1', [
        { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
        { id: 'office-2', nome: 'Escritório B', papel: 'ADVOGADO' },
      ]);
    useOfficeStore.getState().removeOffice('office-2');

    const state = useOfficeStore.getState();
    expect(state.escritorios).toEqual([{ id: 'office-1', nome: 'Escritório A', papel: 'OWNER' }]);
    expect(state.escritorioAtivoId).toBe('office-1');
  });

  it('reset volta ao estado inicial (usado no logout)', () => {
    useOfficeStore
      .getState()
      .hydrateFromLogin('office-1', [{ id: 'office-1', nome: 'Escritório A', papel: 'OWNER' }]);
    useOfficeStore.getState().reset();

    const state = useOfficeStore.getState();
    expect(state.status).toBe('idle');
    expect(state.escritorioAtivoId).toBeNull();
    expect(state.escritorios).toEqual([]);
  });
});
