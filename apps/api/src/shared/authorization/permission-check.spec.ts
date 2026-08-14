import { hasAllPermissions, hasAnyPermission, hasPermission } from './permission-check';

describe('hasPermission', () => {
  it('retorna true para correspondência exata', () => {
    expect(hasPermission(['case:read:assigned'], 'case:read:assigned')).toBe(true);
  });

  it('retorna true quando o portador tem o escopo ALL mais amplo', () => {
    expect(hasPermission(['case:read:all'], 'case:read:assigned')).toBe(true);
  });

  it('retorna false quando não há correspondência nem escopo ALL', () => {
    expect(hasPermission(['case:read:team'], 'case:read:assigned')).toBe(false);
  });

  it('não aplica a regra de escopo ALL a chaves sem 3 segmentos', () => {
    expect(hasPermission(['office:update'], 'office:read')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('retorna true se qualquer uma das permissões exigidas está presente', () => {
    expect(hasAnyPermission(['client:read'], ['case:read:all', 'client:read'])).toBe(true);
  });

  it('retorna false quando nenhuma está presente', () => {
    expect(hasAnyPermission(['client:read'], ['case:read:all', 'document:create'])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('retorna true só quando todas as permissões exigidas estão presentes', () => {
    expect(
      hasAllPermissions(['client:read', 'client:update'], ['client:read', 'client:update']),
    ).toBe(true);
  });

  it('retorna false quando falta qualquer uma', () => {
    expect(hasAllPermissions(['client:read'], ['client:read', 'client:update'])).toBe(false);
  });
});
