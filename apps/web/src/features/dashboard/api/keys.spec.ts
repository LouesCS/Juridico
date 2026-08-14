import { describe, expect, it } from 'vitest';
import { dashboardKeys } from './keys';

describe('dashboardKeys', () => {
  it('toda chave é escopada por officeId (docs/frontend/10-tanstack-query.md §10.2)', () => {
    expect(dashboardKeys.deadlines('office-1')).toEqual(['office', 'office-1', 'dashboard', 'deadlines']);
    expect(dashboardKeys.recentCases('office-1')).toEqual([
      'office',
      'office-1',
      'dashboard',
      'recent-cases',
    ]);
    expect(dashboardKeys.deadlines('office-2')).not.toEqual(dashboardKeys.deadlines('office-1'));
  });
});
