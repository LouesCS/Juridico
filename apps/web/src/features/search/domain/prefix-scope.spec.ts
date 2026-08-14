import { describe, expect, it } from 'vitest';
import { parsePrefixedQuery } from './prefix-scope';

describe('parsePrefixedQuery', () => {
  it('sem prefixo devolve o texto como está', () => {
    expect(parsePrefixedQuery('silva')).toEqual({ scope: null, actionsOnly: false, rest: 'silva' });
  });

  it('prefixo p: mapeia para legal-cases', () => {
    expect(parsePrefixedQuery('p:silva')).toEqual({
      scope: 'legal-cases',
      actionsOnly: false,
      rest: 'silva',
    });
  });

  it('prefixo d: mapeia para documents', () => {
    expect(parsePrefixedQuery('d:contrato')).toEqual({
      scope: 'documents',
      actionsOnly: false,
      rest: 'contrato',
    });
  });

  it('prefixo c: mapeia para clients', () => {
    expect(parsePrefixedQuery('c:roberto')).toEqual({
      scope: 'clients',
      actionsOnly: false,
      rest: 'roberto',
    });
  });

  it('prefixo > marca modo somente-ações', () => {
    expect(parsePrefixedQuery('>novo processo')).toEqual({
      scope: null,
      actionsOnly: true,
      rest: 'novo processo',
    });
  });

  it('prefixo é case-insensitive', () => {
    expect(parsePrefixedQuery('P:Silva')).toEqual({
      scope: 'legal-cases',
      actionsOnly: false,
      rest: 'Silva',
    });
  });
});
