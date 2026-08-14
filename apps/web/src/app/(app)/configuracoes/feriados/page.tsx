'use client';

import { ConfigurationRouteGuard, HolidaysPage } from '@/features/configuration';

export default function FeriadosPage() {
  return (
    <ConfigurationRouteGuard
      title="Feriados"
      description="Calendário de feriados deste escritório."
      requiredPermissions={['configuration:read']}
    >
      <HolidaysPage />
    </ConfigurationRouteGuard>
  );
}
