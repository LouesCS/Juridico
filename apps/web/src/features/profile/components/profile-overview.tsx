'use client';

import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth';
import { ThemePreference } from './theme-preference';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Reafirma docs/frontend-implementation/19-decisions.md — não existe
 * `PATCH /me` no backend real (`identity.controller.ts` só tem `GET /me`
 * e `POST /me/password`). Nenhum formulário de edição foi construído
 * para não simular uma gravação que o servidor não aceita; os dados
 * mostrados aqui são só leitura, direto de `GET /me`.
 */
export function ProfileOverview() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {user?.usuario.avatarUrl && <AvatarImage src={user.usuario.avatarUrl} alt="" />}
          <AvatarFallback className="text-lg">
            {user ? initials(user.usuario.nome) : ''}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-medium">
            {user?.usuario.nome} {user?.usuario.sobrenome}
          </p>
          <p className="text-sm text-muted-foreground">{user?.usuario.email}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Papel</dt>
          <dd>{user?.membro.papel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Escritório</dt>
          <dd>{user?.escritorio.nome}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Idioma</dt>
          <dd>{user?.usuario.idioma ?? 'pt-BR'}</dd>
        </div>
      </dl>

      <section aria-labelledby="profile-preferences-heading" className="space-y-4">
        <h2 id="profile-preferences-heading" className="text-base font-medium">
          Preferências
        </h2>
        <ThemePreference />
      </section>

      <Alert variant="warning">
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>Edição de perfil ainda não disponível</AlertTitle>
        <AlertDescription>
          O backend ainda não expõe um endpoint para atualizar nome, foto, telefone ou idioma. Esta
          tela mostra seus dados atuais, mas a edição desses dados fica pendente até esse endpoint
          existir.
        </AlertDescription>
      </Alert>
    </div>
  );
}
