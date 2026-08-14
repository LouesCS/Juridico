'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Bot, History, Search, Sparkles, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { PlaceholderTabContent } from '@/components/feedback/placeholder-tab-content';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { type TimelineCategory, typesForCategory } from '../domain/timeline-meta';
import { useCreateManualTimelineEvent } from '../api/mutations';
import { useCaseTimeline } from '../api/queries';
import type { TimelineItemDTO } from '../api/timeline.api';
import { TimelineItemCard } from './timeline-item-card';

const QUICK_CATEGORIES: Array<{ value: 'todos' | TimelineCategory; label: string }> = [
  { value: 'todos', label: 'Tudo' },
  { value: 'comentario', label: 'Comentários' },
  { value: 'documento', label: 'Documentos' },
  { value: 'prazo', label: 'Prazos' },
  { value: 'equipe', label: 'Equipe' },
  { value: 'ia', label: 'IA' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'usuario', label: 'Usuário' },
  { value: 'cliente', label: 'Cliente' },
];

const noteSchema = z.object({ titulo: z.string().min(2, 'Escreva ao menos 2 caracteres.').max(150) });
type NoteFormValues = z.infer<typeof noteSchema>;

function groupLabel(date: Date): string {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays <= 7) return 'Esta semana';
  if (diffDays <= 30) return 'Este mês';
  return 'Mais antigos';
}

function groupItems(items: TimelineItemDTO[]): Array<[string, TimelineItemDTO[]]> {
  const order = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Mais antigos'];
  const groups = new Map<string, TimelineItemDTO[]>();
  for (const item of items) {
    const label = groupLabel(new Date(item.dataEvento));
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return order.filter((label) => groups.has(label)).map((label) => [label, groups.get(label)!]);
}

/**
 * "Workspace" de Timeline (Sprint 08) — nunca uma lista simples: agrupada
 * por recência, com filtros por categoria, busca por texto, compositor de
 * anotação manual e card de IA (placeholder honesto, sem simular dado).
 */
export function CaseTimeline({ processoId }: { processoId: string }) {
  const [category, setCategory] = React.useState<'todos' | TimelineCategory>('todos');
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const createNote = useCreateManualTimelineEvent(processoId);

  const tipoFilter = category === 'todos' ? undefined : typesForCategory(category).join(',');
  const { data, isLoading, isError, refetch } = useCaseTimeline(processoId, {
    tipo: tipoFilter,
    q: debouncedSearch || undefined,
    limit: 50,
  });

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { titulo: '' },
  });

  function onSubmitNote(values: NoteFormValues) {
    createNote.mutate(
      { tipo: 'ANOTACAO', titulo: values.titulo },
      {
        onSuccess: () => {
          toast.success('Anotação adicionada à timeline.');
          form.reset();
        },
        onError: () => toast.error('Não foi possível adicionar a anotação.'),
      },
    );
  }

  const items = data?.items ?? [];
  const pinned = items.filter((i) => i.fixado);
  const rest = items.filter((i) => !i.fixado);
  const grouped = groupItems(rest);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">Resumo Inteligente</CardTitle>
          <Badge variant="outline" className="ml-auto">Em breve</Badge>
        </CardHeader>
        <CardContent>
          <PlaceholderTabContent
            icon={Bot}
            title="IA ainda não integrada"
            description="Em breve, a IA vai resumir automaticamente os eventos mais relevantes desta timeline."
          />
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitNote)} className="flex items-start gap-2">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input {...field} placeholder="Adicionar uma anotação a esta timeline..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" loading={createNote.isPending}>
            <StickyNote className="size-4" aria-hidden="true" />
            Anotar
          </Button>
        </form>
      </Form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CATEGORIES.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={category === option.value ? 'secondary' : 'ghost'}
              onClick={() => setCategory(option.value)}
              aria-pressed={category === option.value}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar na timeline"
            aria-label="Buscar na timeline"
            className="pl-8"
          />
        </div>
      </div>

      {isError && <ErrorState title="Não foi possível carregar a timeline." onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <PlaceholderTabContent
          icon={History}
          title="Nenhum evento ainda"
          description="Assim que houver movimentações neste processo, elas aparecerão aqui automaticamente."
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fixados</p>
              {pinned.map((item) => (
                <TimelineItemCard key={item.id} processoId={processoId} item={item} />
              ))}
            </div>
          )}
          {grouped.map(([label, groupItemsList]) => (
            <div key={label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              {groupItemsList.map((item) => (
                <TimelineItemCard key={item.id} processoId={processoId} item={item} />
              ))}
            </div>
          ))}
        </div>
      )}

      {data?.nextCursor && (
        <p className="text-center text-xs text-muted-foreground">
          Mostrando {items.length} eventos — refine os filtros para ver mais.
        </p>
      )}
    </div>
  );
}
