import { apiClient } from '@/lib/api/client';

/**
 * `POST /auth/switch-office` é exposto pelo `IdentityController` real do
 * backend (apps/api/src/modules/identity/presentation/identity.controller.ts),
 * não por um controller "Offices" dedicado — a divisão em `features/office`
 * no frontend é uma decisão de organização por domínio (docs/frontend/
 * 02-estrutura-pastas.md §1.5), não uma cópia 1:1 da estrutura de módulos
 * do backend.
 */
export interface SwitchOfficeInput {
  escritorioId: string;
}

export const officeApi = {
  switchOffice: (input: SwitchOfficeInput) =>
    apiClient.post<{ ok: true }>('/auth/switch-office', input),
};
