export const permissionsKeys = {
  all: (officeId: string) => ['office', officeId, 'permissions'] as const,
  catalog: (officeId: string) => [...permissionsKeys.all(officeId), 'catalog'] as const,
  role: (officeId: string, id: string) => [...permissionsKeys.all(officeId), 'role', id] as const,
};
