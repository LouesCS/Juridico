'use client';

import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiDashboardInsights } from '../api/queries';
import { AiDisclaimer } from './ai-disclaimer';

/**
 * Reafirma Sprint 11 §"IA DO DASHBOARD" — card "✨ Assistente Jurídico".
 * Insights vêm de `GET /ai/dashboard-insights`, que é regra determinística
 * sobre dados reais (não uma chamada ao provedor de IA — ver comentário em
 * `dashboard-insights.use-case.ts` no backend); o disclaimer aparece do
 * mesmo jeito, já que a apresentação ao usuário é a mesma ("Assistente"),
 * mesmo a implementação por trás não sendo generativa.
 */
export function AiInsightsCard() {
  const { data, isLoading, isError, refetch } = useAiDashboardInsights();
  const insights = data?.insights ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Sparkles className="size-4 text-ai" aria-hidden="true" />
        <CardTitle className="text-base">Assistente Jurídico</CardTitle>
        <Badge variant="ai" className="ml-auto">IA</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {!isLoading && isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && insights.length === 0 && (
          <EmptyState icon={Sparkles} title="Tudo em ordem" description="Nenhum ponto de atenção identificado agora." />
        )}
        {!isLoading && !isError && insights.length > 0 && (
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ai" aria-hidden="true" />
                {insight}
              </li>
            ))}
          </ul>
        )}
        {!isLoading && !isError && insights.length > 0 && <AiDisclaimer />}
      </CardContent>
    </Card>
  );
}
