import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/data-display/status-badge';
import { SEARCH_GROUP_ICONS } from '../domain/group-icons';
import type { SearchResultItem } from '../api/search.api';

function formatDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
}

function formatBytes(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let result = bytes / 1024;
  let unitIndex = 0;
  while (result >= 1024 && unitIndex < units.length - 1) {
    result /= 1024;
    unitIndex++;
  }
  return `${result.toFixed(1)} ${units[unitIndex]}`;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * Preview lateral — reafirma docs/ux/09-busca-global.md ("ao selecionar um
 * item, mostrar preview lateral"). Usa só os campos já devolvidos no próprio
 * item de busca (`metadata`), NUNCA busca a entidade completa de novo — uma
 * segunda chamada por seleção/tecla violaria "nunca bloquear a UI" e o
 * orçamento de latência da busca (docs/api/15-search.md §15.1); simplificação
 * deliberada, documentada em docs/frontend-implementation/21-context-next-step.md.
 */
export function SearchPreviewPanel({ item }: { item: SearchResultItem }) {
  const Icon = SEARCH_GROUP_ICONS[item.tipo];
  const m = item.metadata;

  return (
    <div className="scrollbar-fade flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.titulo}</p>
          {item.subtitulo && (
            <p className="truncate text-sm text-muted-foreground">{item.subtitulo}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border p-3">
        {item.tipo === 'clients' && (
          <>
            <Row
              label="Tipo"
              value={m.tipo === 'PESSOA_FISICA' ? 'Pessoa física' : 'Pessoa jurídica'}
            />
            <Row label="Documento" value={m.documento as string} />
            <Row
              label="Status"
              value={typeof m.status === 'string' ? <StatusBadge status={m.status} /> : null}
            />
            <Row label="E-mail" value={Array.isArray(m.emails) ? (m.emails[0] as string) : null} />
            <Row
              label="Telefone"
              value={Array.isArray(m.telefones) ? (m.telefones[0] as string) : null}
            />
          </>
        )}
        {item.tipo === 'legal-cases' && (
          <>
            <Row
              label="Status"
              value={typeof m.status === 'string' ? <StatusBadge status={m.status} /> : null}
            />
            <Row label="Prioridade" value={m.prioridade as string} />
            <Row
              label="Cliente"
              value={
                typeof m.cliente === 'object' && m.cliente
                  ? (m.cliente as { nome: string }).nome
                  : null
              }
            />
            <Row label="Próximo prazo" value={formatDate(m.proximaDataRelevante)} />
            {m.segredoJustica === true && <Badge variant="destructive">Segredo de justiça</Badge>}
          </>
        )}
        {item.tipo === 'documents' && (
          <>
            <Row
              label="Extensão"
              value={typeof m.extensao === 'string' ? m.extensao.toUpperCase() : null}
            />
            <Row label="Tamanho" value={formatBytes(m.tamanhoBytes)} />
            <Row label="Versão" value={m.versao != null ? `v${m.versao}` : null} />
            <Row
              label="Processo"
              value={
                typeof m.processo === 'object' && m.processo
                  ? (m.processo as { titulo: string }).titulo
                  : null
              }
            />
            {Array.isArray(m.tags) && m.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {(m.tags as string[]).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
        {item.tipo === 'deadlines' && (
          <>
            <Row
              label="Status"
              value={typeof m.status === 'string' ? <StatusBadge status={m.status} /> : null}
            />
            <Row label="Vencimento" value={formatDate(m.dataVencimento)} />
            <Row label="Prioridade" value={m.prioridade as string} />
          </>
        )}
        {item.tipo === 'tasks' && (
          <>
            <Row label="Status" value={m.status as string} />
            <Row label="Vencimento" value={formatDate(m.dataVencimento)} />
            <Row label="Concluída" value={m.concluida === true ? 'Sim' : 'Não'} />
          </>
        )}
        {item.tipo === 'timeline' && (
          <>
            <Row label="Tipo" value={m.tipoEvento as string} />
            <Row label="Data" value={formatDate(m.dataEvento)} />
          </>
        )}
        {item.tipo === 'team' && (
          <>
            <Row label="E-mail" value={m.email as string} />
            <Row label="Papel" value={m.papel as string} />
          </>
        )}
        {item.tipo === 'folders' && <Row label="Documentos" value={m.totalDocumentos as number} />}
      </div>

      <div className="rounded-md border border-dashed border-border p-3">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">Resumo Inteligente</span>
          <Badge variant="outline" className="ml-auto">
            Em breve
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          A IA vai resumir este resultado automaticamente — recurso Premium previsto para a Sprint
          11.
        </p>
      </div>
    </div>
  );
}
