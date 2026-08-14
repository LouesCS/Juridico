'use client';

import * as React from 'react';
import { RefreshCw, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { usePermission } from '@/hooks/use-permission';
import { useCancelSummary, useRegenerateSummary, useRequestSummary, useSummaryFeedback } from '../api/mutations';
import { useSummaries, useSummarySources } from '../api/queries';
import type { EscopoResumoIA, TipoResumoIA } from '../api/ai.api';
import { AiDisclaimer } from './ai-disclaimer';
import { SourceList } from './source-list';
import { TypewriterText } from './typewriter-text';

const TIPO_RESUMO_OPTIONS: Array<{ value: TipoResumoIA; label: string }> = [
  { value: 'GERAL', label: 'Geral' },
  { value: 'EXECUTIVO', label: 'Executivo' },
  { value: 'CRONOLOGICO', label: 'Cronológico' },
  { value: 'PONTOS_CHAVE', label: 'Pontos-chave' },
  { value: 'RISCOS', label: 'Riscos' },
];

/** Reafirma docs/backend-implementation/23-task-engine.md §23.8 — as 5 ações de IA de Tarefa. */
const TIPO_RESUMO_TAREFA_OPTIONS: Array<{ value: TipoResumoIA; label: string }> = [
  { value: 'TAREFA_RESUMO', label: 'Resumo' },
  { value: 'TAREFA_CHECKLIST', label: 'Gerar checklist' },
  { value: 'TAREFA_PROXIMOS_PASSOS', label: 'Próximos passos' },
  { value: 'TAREFA_DESCRICAO', label: 'Gerar descrição' },
  { value: 'TAREFA_CONTEXTO', label: 'Explicar contexto' },
];

function defaultTipoResumo(escopoTipo: EscopoResumoIA): TipoResumoIA {
  if (escopoTipo === 'DOCUMENTO') return 'RESUMO_DOCUMENTO';
  if (escopoTipo === 'CLIENTE') return 'HISTORICO_CLIENTE';
  if (escopoTipo === 'TAREFA') return 'TAREFA_RESUMO';
  return 'GERAL';
}

/**
 * Painel de IA reutilizado nas 3 telas de "Resumir" (Processo/Documento/
 * Cliente) — reafirma docs/frontend/22-ai.md §22.1/§22.3. Único componente
 * autorizado a usar `bg-ai-subtle` como fundo de card inteiro (aqui só o
 * cabeçalho, com a variante `Button` `ai` no botão principal).
 */
export function AiSummaryPanel({ escopoTipo, escopoId }: { escopoTipo: EscopoResumoIA; escopoId: string }) {
  const [tipoResumo, setTipoResumo] = React.useState<TipoResumoIA>(defaultTipoResumo(escopoTipo));
  const canSeeUsage = usePermission('ai:usage:read');
  const previousStatusRef = React.useRef<string | undefined>(undefined);

  const { data: summaries, isLoading, isError, refetch } = useSummaries(escopoTipo, escopoId);
  const summary = summaries?.find((s) => s.tipoResumo === tipoResumo && s.vigente);
  const { data: sources } = useSummarySources(summary?.status === 'PRONTO' ? summary.id : null);

  const requestSummary = useRequestSummary();
  const regenerate = useRegenerateSummary();
  const feedback = useSummaryFeedback();
  const cancel = useCancelSummary();

  const justFinished = previousStatusRef.current === 'GERANDO' && summary?.status === 'PRONTO';
  React.useEffect(() => {
    previousStatusRef.current = summary?.status;
  }, [summary?.status]);

  function handleGenerate() {
    requestSummary.mutate(
      { escopoTipo, escopoId, tipoResumo },
      { onError: (error) => toast.error(errorMessage(error)) },
    );
  }

  function handleRegenerate() {
    if (!summary) return;
    regenerate.mutate(
      { id: summary.id, escopoTipo, escopoId },
      { onError: (error) => toast.error(errorMessage(error)) },
    );
  }

  function handleFeedback(value: 'POSITIVO' | 'NEGATIVO') {
    if (!summary) return;
    feedback.mutate({ id: summary.id, feedback: value }, { onSuccess: () => toast.success('Obrigado pelo feedback!') });
  }

  function handleCancel() {
    if (!summary) return;
    cancel.mutate(summary.id, { onSuccess: () => refetch() });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border">
      <div className="flex items-center gap-2 rounded-t-lg bg-ai-subtle px-4 py-3">
        <Sparkles className="size-4 text-ai" aria-hidden="true" />
        <span className="font-medium text-ai">Assistente Jurídico</span>
        {(escopoTipo === 'PROCESSO' || escopoTipo === 'TAREFA') && (
          <Select value={tipoResumo} onValueChange={(value) => setTipoResumo(value as TipoResumoIA)}>
            <SelectTrigger className="ml-auto h-8 w-40 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(escopoTipo === 'TAREFA' ? TIPO_RESUMO_TAREFA_OPTIONS : TIPO_RESUMO_OPTIONS).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-3 px-4 pb-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {!isLoading && isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && !summary && (
          <EmptyState
            icon={Sparkles}
            title="Nenhum resumo gerado ainda"
            description="A IA pode gerar um resumo a partir dos dados reais deste item."
            action={
              <Button variant="ai" size="sm" onClick={handleGenerate} disabled={requestSummary.isPending}>
                <Sparkles className="mr-1.5 size-4" aria-hidden="true" />
                {requestSummary.isPending ? 'Solicitando…' : 'Gerar resumo'}
              </Button>
            }
          />
        )}

        {summary && (summary.status === 'GERANDO' || summary.status === 'PENDENTE') && (
          <div className="space-y-2" role="status">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerando resumo…</p>
              <Button variant="ghost" size="sm" className="h-7" onClick={handleCancel} disabled={cancel.isPending}>
                <X className="mr-1 size-3.5" aria-hidden="true" />
                Cancelar
              </Button>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        )}

        {summary && summary.status === 'FALHA' && (
          <ErrorState
            title="Não foi possível gerar o resumo agora."
            description={summary.erro ?? undefined}
            onRetry={handleGenerate}
          />
        )}

        {summary && summary.status === 'PRONTO' && summary.conteudo && (
          <div className="space-y-3">
            <TypewriterText text={summary.conteudo} animate={justFinished} />

            {sources && sources.length > 0 && <SourceList sources={sources} />}

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                v{summary.versaoResumo} · {summary.modelo}
                {canSeeUsage && summary.custoEstimadoCentavos != null && (
                  <> · R$ {(summary.custoEstimadoCentavos / 100).toFixed(2)}</>
                )}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Achei útil"
                  aria-pressed={summary.feedback === 'POSITIVO'}
                  onClick={() => handleFeedback('POSITIVO')}
                >
                  <ThumbsUp className={summary.feedback === 'POSITIVO' ? 'size-3.5 fill-current' : 'size-3.5'} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Não achei útil"
                  aria-pressed={summary.feedback === 'NEGATIVO'}
                  onClick={() => handleFeedback('NEGATIVO')}
                >
                  <ThumbsDown className={summary.feedback === 'NEGATIVO' ? 'size-3.5 fill-current' : 'size-3.5'} aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7" onClick={handleRegenerate} disabled={regenerate.isPending}>
                  <RefreshCw className="mr-1 size-3.5" aria-hidden="true" />
                  Regenerar
                </Button>
              </div>
            </div>

            <AiDisclaimer />
          </div>
        )}
      </div>
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    if (code === 'AI_QUOTA_EXCEEDED') {
      return 'Este escritório atingiu o limite de resumos de IA do mês. Fale com o administrador da conta.';
    }
  }
  return 'Não foi possível solicitar o resumo agora.';
}
