'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/features/auth';
import { PermissionsAdminPage } from '@/features/permissions';
import { useAnyPermission } from '@/hooks/use-permission';

/**
 * "Perfis e Permissões" / "Simulador" — mesma tela e mesmo gate de rota
 * (`office:update`) que viviam em `/configuracoes` desde o Prompt 12,
 * apenas realocados para sua própria rota agora que `/configuracoes`
 * (Prompt 13) virou o Dashboard das Configurações + Geral. Nenhum
 * comportamento interno de `PermissionsAdminPage` muda por causa desta
 * realocação, exceto a aba "IA" (movida para `/configuracoes/ia`).
 */
export default function PermissoesPage() {
  const router = useRouter();
  const { isLoading } = useCurrentUser();
  const allowed = useAnyPermission(['office:update']);

  React.useEffect(() => {
    if (isLoading || allowed) return;
    toast.error('Você não tem permissão para acessar as configurações do escritório.');
    router.replace('/');
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) return null;

  return (
    <div>
      <PageHeader
        title="Permissões"
        description="Perfis, permissões e simulação de outros membros."
        breadcrumbs={[{ label: 'Configurações', href: '/configuracoes' }, { label: 'Permissões' }]}
      />
      <PermissionsAdminPage />
    </div>
  );
}
