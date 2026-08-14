import Link from 'next/link';
import { CheckSquare, FileText, History, Scale, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AiSourceDTO } from '../api/ai.api';

const ICON_POR_TIPO = {
  DOCUMENTO: FileText,
  EVENTO_TIMELINE: History,
  METADADO_PROCESSO: Scale,
  PROCESSO: Scale,
  CLIENTE: Users,
  TAREFA: CheckSquare,
} as const;

function urlFor(fonte: AiSourceDTO): string | null {
  if (fonte.documentoId) return `/documentos/${fonte.documentoId}`;
  if (fonte.processoId) return `/processos/${fonte.processoId}`;
  if (fonte.clienteId) return `/clientes/${fonte.clienteId}`;
  if (fonte.tarefaId) return `/tarefas/${fonte.tarefaId}`;
  return null;
}

/**
 * Reafirma docs/frontend/22-ai.md §22.4 — fonte é clicável só quando dá
 * para montar uma URL real (documento/processo/cliente); evento de timeline
 * e metadado de processo não têm rota própria, aparecem como chip estático.
 * Nunca um link que resultaria em 404 por falta de permissão — o backend já
 * só cita fontes que existiam no momento da geração, dentro do escopo de
 * quem gerou.
 */
export function SourceList({ sources }: { sources: AiSourceDTO[] }) {
  if (sources.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Fontes utilizadas</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((fonte) => {
          const Icon = ICON_POR_TIPO[fonte.sourceType];
          const href = urlFor(fonte);
          const content = (
            <Badge variant="outline" className="gap-1">
              <Icon className="size-3" aria-hidden="true" />
              {fonte.trechoOuReferencia ?? fonte.sourceType}
            </Badge>
          );
          return href ? (
            <Link key={fonte.id} href={href} className="hover:opacity-80">
              {content}
            </Link>
          ) : (
            <span key={fonte.id}>{content}</span>
          );
        })}
      </div>
    </div>
  );
}
