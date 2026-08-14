'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/hooks/use-permission';
import { InviteMemberDialog } from './invite-member-dialog';
import { InvitationsTable } from './invitations-table';
import { MembersTable } from './members-table';

export function TeamPage() {
  const canInvite = usePermission('member:invite');

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Membros do escritório e convites pendentes."
        actions={canInvite ? <InviteMemberDialog /> : undefined}
      />
      {canInvite ? (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="invitations">Convites</TabsTrigger>
          </TabsList>
          <TabsContent value="members">
            <MembersTable />
          </TabsContent>
          <TabsContent value="invitations">
            <InvitationsTable />
          </TabsContent>
        </Tabs>
      ) : (
        <MembersTable />
      )}
    </div>
  );
}
