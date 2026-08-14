import { beforeEach, describe, expect, it } from 'vitest';
import { clearSearchHistory, getSearchHistory, pushSearchTerm } from './search-history';

describe('search-history (localStorage)', () => {
  beforeEach(() => {
    clearSearchHistory();
  });

  it('começa vazio', () => {
    expect(getSearchHistory()).toEqual([]);
  });

  it('ignora termos com menos de 2 caracteres', () => {
    pushSearchTerm('a');
    expect(getSearchHistory()).toEqual([]);
  });

  it('adiciona termo no topo e remove duplicata case-insensitive', () => {
    pushSearchTerm('Silva');
    pushSearchTerm('processo');
    pushSearchTerm('silva');

    const history = getSearchHistory();
    expect(history).toEqual(['silva', 'processo']);
  });

  it('mantém no máximo 10 termos', () => {
    for (let i = 0; i < 15; i++) pushSearchTerm(`termo${i}`);
    expect(getSearchHistory()).toHaveLength(10);
    expect(getSearchHistory()[0]).toBe('termo14');
  });

  it('clearSearchHistory limpa tudo', () => {
    pushSearchTerm('silva');
    clearSearchHistory();
    expect(getSearchHistory()).toEqual([]);
  });
});
