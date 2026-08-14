'use client';

import * as React from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useMembers } from '@/features/team';
import { usePermission } from '@/hooks/use-permission';
import { useCreateTaskComment } from '../api/mutations';
import { useTaskComments } from '../api/queries';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Escopo mínimo (Prompt 14) — reaproveita `Comentario` (schema desde a Fase
 * 1, nunca implementado até aqui); só criar/listar, sem edição/exclusão/
 * menções (mesmo recorte de `task-comments.use-cases.ts` no backend).
 */
export function TaskCommentsTab({ taskId }: { taskId: string }) {
  const canComment = usePermission('comment:create');
  const [conteudo, setConteudo] = React.useState('');
  const { data: comments, isLoading, isError, refetch } = useTaskComments(taskId);
  const { data: members } = useMembers();
  const createComment = useCreateTaskComment();

  const nomePorAutorId = new Map((members ?? []).map((m) => [m.id, m.usuario.nome]));

  function handleSubmit() {
    if (!conteudo.trim()) return;
    createComment.mutate(
      { tarefaId: taskId, conteudo: conteudo.trim() },
      {
        onSuccess: () => setConteudo(''),
        onError: () => toast.error('Não foi possível adicionar o comentário.'),
      },
    );
  }

  if (isError) return <ErrorState title="Não foi possível carregar os comentários." onRetry={() => refetch()} />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !comments || comments.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sem comentários" description="Nenhum comentário nesta tarefa ainda." />
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => {
              const nome = nomePorAutorId.get(comment.autorId) ?? 'Membro';
              return (
                <li key={comment.id} className="flex gap-3">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-xs">{initials(nome)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 rounded-md border border-border px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.criadoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{comment.conteudo}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canComment && (
          <div className="flex items-start gap-2 border-t border-border pt-4">
            <textarea
              value={conteudo}
              onChange={(event) => setConteudo(event.target.value)}
              placeholder="Adicionar um comentário..."
              className="min-h-16 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button size="sm" disabled={!conteudo.trim() || createComment.isPending} onClick={handleSubmit}>
              <Send className="size-4" aria-hidden="true" />
              Enviar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
