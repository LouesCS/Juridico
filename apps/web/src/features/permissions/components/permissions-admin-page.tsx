'use client';

import { ShieldOff } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/features/auth';
import { hasPermission } from '@/lib/permissions/has-permission';
import { RolePermissionsPanel } from './role-permissions-panel';
import { SimulatorTab } from './simulator-tab';

/**
 * Tela Administrativa do Permission Engine (Prompt 12), agora em
 * `/configuracoes/permissoes` (Sprint 13/Prompt 13 moveu a aba "IA" para
 * `/configuracoes/ia`, junto da parametrização nova de IA — este
 * componente não muda internamente, só perdeu essa aba). Cada aba tem seu
 * próprio gate de permissão, além do gate de rota (`office:update`) já
 * aplicado pela página: Perfis/Permissões exige `role:manage`, Simulador
 * exige `simulation:use`.
 *
 * Espera `useCurrentUser()` carregar antes de montar as `Tabs` — o Radix
 * `Tabs` só lê `defaultValue` uma vez, no primeiro render; calculá-lo a
 * partir de uma permissão que ainda não chegou (`data` undefined enquanto
 * `GET /me` está em voo) travaria no valor errado, mesmo depois da
 * permissão real chegar (mesma condição de corrida já corrigida em
 * `SidebarContent`, Prompt 11).
 */
export function PermissionsAdminPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || !user) return <Skeleton className="h-64 w-full" />;

  const atorPermissions = user.membro.permissions;
  const canManageRoles = hasPermission(atorPermissions, 'role:manage');
  const canSimulate = hasPermission(atorPermissions, 'simulation:use');

  if (!canManageRoles && !canSimulate) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Nenhuma configuração de permissões disponível"
        description="Você tem acesso às Configurações, mas nenhuma permissão de Perfis ou Simulador foi concedida a você."
      />
    );
  }

  return (
    <Tabs defaultValue={canManageRoles ? 'perfis' : 'simulador'}>
      <TabsList>
        {canManageRoles && <TabsTrigger value="perfis">Perfis e Permissões</TabsTrigger>}
        {canSimulate && <TabsTrigger value="simulador">Simulador</TabsTrigger>}
      </TabsList>

      {canManageRoles && (
        <TabsContent value="perfis" className="pt-4">
          <RolePermissionsPanel atorPermissions={atorPermissions} />
        </TabsContent>
      )}

      {canSimulate && (
        <TabsContent value="simulador" className="pt-4">
          <SimulatorTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
