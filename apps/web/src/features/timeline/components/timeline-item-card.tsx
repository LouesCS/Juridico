'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Copy, ExternalLink, Pin, PinOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { TIMELINE_TYPE_META } from '../domain/timeline-meta';
import type { TimelineItemDTO } from '../api/timeline.api';
import { useDeleteManualTimelineEvent, useToggleTimelineEventPin } from '../api/mutations';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function entityHref(entidade: { tipo: string; id: string }): string | null {
  if (entidade.tipo === 'cliente') return `/clientes/${entidade.id}`;
  if (entidade.tipo === 'membro') return `/admin/usuarios`;
  return null;
}

export function TimelineItemCard({ processoId, item }: { processoId: string; item: TimelineItemDTO }) {
  const [expanded, setExpanded] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const togglePin = useToggleTimelineEventPin(processoId);
  const deleteEvent = useDeleteManualTimelineEvent(processoId);
  const meta = TIMELINE_TYPE_META[item.tipo];
  const Icon = meta.icon;
  const entityLink = item.entidadeRelacionada ? entityHref(item.entidadeRelacionada) : null;

  const time = new Date(item.dataEvento);

  function handleCopyLink() {
    const url = `${window.location.origin}/processos/${processoId}?evento=${item.id}`;
    navigator.clipboard?.writeText(url);
    toast.success('Link copiado.');
  }

  return (
    <Card className="group relative flex gap-3 p-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.colorClass}`}>
        <Icon className="size-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{item.titulo}</p>
              {item.fixado && <Badge variant="outline" className="shrink-0 gap-1"><Pin className="size-3" aria-hidden="true" />Fixado</Badge>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>
                {time.toLocaleDateString('pt-BR')} às {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {item.autor && (
                <span className="flex items-center gap-1">
                  <Avatar className="size-4">
                    <AvatarFallback className="text-[8px]">{initials(item.autor.nome)}</AvatarFallback>
                  </Avatar>
                  {item.autor.nome}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {item.descricao && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={expanded ? 'Colapsar' : 'Expandir'}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-7" aria-label="Copiar link" onClick={handleCopyLink}>
              <Copy className="size-3.5" aria-hidden="true" />
            </Button>
            {entityLink && (
              <Button variant="ghost" size="icon" className="size-7" aria-label="Abrir entidade" asChild>
                <Link href={entityLink}>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            )}
            {item.editavel && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={item.fixado ? 'Desafixar' : 'Fixar'}
                  onClick={() => togglePin.mutate({ eventoId: item.id, fixado: !item.fixado })}
                >
                  {item.fixado ? <PinOff className="size-3.5" aria-hidden="true" /> : <Pin className="size-3.5" aria-hidden="true" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  aria-label="Excluir"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        </div>

        {expanded && item.descricao && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.descricao}</p>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir anotação"
        description="Esta anotação será removida da timeline. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleteEvent.isPending}
        onConfirm={() =>
          deleteEvent.mutate(item.id, {
            onSuccess: () => {
              toast.success('Anotação excluída.');
              setDeleteOpen(false);
            },
            onError: () => toast.error('Não foi possível excluir.'),
          })
        }
      />
    </Card>
  );
}
