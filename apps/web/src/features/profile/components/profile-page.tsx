'use client';

import { ShieldOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { ChangePasswordForm } from './change-password-form';
import { ProfileOverview } from './profile-overview';
import { SessionsList } from './sessions-list';

/**
 * MFA/OAuth pedidos pelo Prompt 6C — reafirma docs/backend-implementation/
 * 00-status.md: nenhum dos dois tem endpoint real. Estado de
 * indisponibilidade controlada, nunca simulado.
 */
function SecurityUnavailableNotice() {
  return (
    <Alert>
      <ShieldOff className="size-4" aria-hidden="true" />
      <AlertTitle>Verificação em duas etapas e login social</AlertTitle>
      <AlertDescription>
        Estes recursos ainda não têm suporte no backend. Ficam pendentes para uma próxima etapa.
      </AlertDescription>
    </Alert>
  );
}

export function ProfilePage() {
  return (
    <div>
      <PageHeader title="Perfil" description="Seus dados, senha e sessões ativas." />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileOverview />
        </TabsContent>
        <TabsContent value="security" className="space-y-8">
          <ChangePasswordForm />
          <SessionsList />
          <SecurityUnavailableNotice />
        </TabsContent>
      </Tabs>
    </div>
  );
}
