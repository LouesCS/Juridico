import {
  Archive,
  ArchiveRestore,
  Bot,
  CalendarClock,
  CheckSquare,
  FileText,
  Gavel,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Scale,
  ScrollText,
  StickyNote,
  Upload,
  Download,
  Users2,
  UserRound,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { TimelineEventType } from '../api/timeline.api';

export type TimelineCategory =
  | 'sistema'
  | 'usuario'
  | 'documento'
  | 'prazo'
  | 'cliente'
  | 'comentario'
  | 'equipe'
  | 'ia'
  | 'seguranca'
  | 'integracao'
  | 'tarefa';

interface TimelineTypeMeta {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  categoria: TimelineCategory;
}

/**
 * Um card por tipo de evento — reafirma Sprint 08 ("cada card deve possuir
 * ícone, cor... tipo"). `categoria` alimenta os filtros rápidos
 * (Tudo/Comentários/Documentos/Prazos/Equipe/IA/Sistema/Usuário/Cliente) —
 * cada categoria mapeia N tipos crus, resolvido aqui para não exigir um
 * `categoria` próprio no backend (mesma decisão de manter o contrato
 * simples e deixar a UI compor).
 */
export const TIMELINE_TYPE_META: Record<TimelineEventType, TimelineTypeMeta> = {
  CRIACAO_PROCESSO: { label: 'Processo criado', icon: Plus, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  ATUALIZACAO_PROCESSO: { label: 'Processo atualizado', icon: Pencil, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  ALTERACAO_STATUS: { label: 'Status alterado', icon: Scale, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  ALTERACAO_RESPONSAVEL: { label: 'Responsável alterado', icon: UserRound, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  ALTERACAO_PRIORIDADE: { label: 'Prioridade alterada', icon: Scale, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  ARQUIVAMENTO: { label: 'Arquivado', icon: Archive, colorClass: 'text-muted-foreground bg-muted', categoria: 'sistema' },
  RESTAURACAO: { label: 'Restaurado', icon: ArchiveRestore, colorClass: 'text-success bg-success-subtle', categoria: 'sistema' },
  MOVIMENTACAO: { label: 'Movimentação', icon: Gavel, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  PETICAO: { label: 'Petição', icon: ScrollText, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  DECISAO: { label: 'Decisão', icon: Gavel, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  SENTENCA: { label: 'Sentença', icon: Gavel, colorClass: 'text-primary bg-primary/10', categoria: 'sistema' },
  AUDIENCIA: { label: 'Audiência', icon: CalendarClock, colorClass: 'text-primary bg-primary/10', categoria: 'prazo' },
  PRAZO: { label: 'Prazo', icon: CalendarClock, colorClass: 'text-warning bg-warning-subtle', categoria: 'prazo' },
  DOCUMENTO: { label: 'Documento', icon: FileText, colorClass: 'text-primary bg-primary/10', categoria: 'documento' },
  COMENTARIO: { label: 'Comentário', icon: MessageSquare, colorClass: 'text-primary bg-primary/10', categoria: 'comentario' },
  CLIENTE_ATUALIZADO: { label: 'Cliente atualizado', icon: UserRound, colorClass: 'text-primary bg-primary/10', categoria: 'cliente' },
  EQUIPE_ALTERADA: { label: 'Equipe alterada', icon: Users2, colorClass: 'text-primary bg-primary/10', categoria: 'equipe' },
  SEGREDO_JUSTICA_ALTERADO: { label: 'Segredo de justiça', icon: Lock, colorClass: 'text-destructive bg-destructive/10', categoria: 'seguranca' },
  IA_EXECUTADA: { label: 'IA executada', icon: Bot, colorClass: 'text-primary bg-primary/10', categoria: 'ia' },
  IMPORTACAO: { label: 'Importação', icon: Upload, colorClass: 'text-muted-foreground bg-muted', categoria: 'integracao' },
  EXPORTACAO: { label: 'Exportação', icon: Download, colorClass: 'text-muted-foreground bg-muted', categoria: 'integracao' },
  ANOTACAO: { label: 'Anotação', icon: StickyNote, colorClass: 'text-secondary-foreground bg-secondary', categoria: 'usuario' },
  PERSONALIZADO: { label: 'Nota', icon: StickyNote, colorClass: 'text-secondary-foreground bg-secondary', categoria: 'usuario' },
  CRIACAO_TAREFA: { label: 'Tarefa criada', icon: Plus, colorClass: 'text-primary bg-primary/10', categoria: 'tarefa' },
  CONCLUSAO_TAREFA: { label: 'Tarefa concluída', icon: CheckSquare, colorClass: 'text-success bg-success-subtle', categoria: 'tarefa' },
  CANCELAMENTO_TAREFA: { label: 'Tarefa cancelada', icon: XCircle, colorClass: 'text-destructive bg-destructive/10', categoria: 'tarefa' },
};

export const TIMELINE_CATEGORY_LABEL: Record<TimelineCategory, string> = {
  sistema: 'Sistema',
  usuario: 'Usuário',
  documento: 'Documentos',
  prazo: 'Prazos',
  cliente: 'Cliente',
  comentario: 'Comentários',
  equipe: 'Equipe',
  ia: 'IA',
  seguranca: 'Segurança',
  integracao: 'Integração',
  tarefa: 'Tarefas',
};

/** Tipos crus que pertencem a cada categoria — usado para montar o filtro `tipo=` (comma-list) enviado à API. */
export function typesForCategory(categoria: TimelineCategory): TimelineEventType[] {
  return (Object.keys(TIMELINE_TYPE_META) as TimelineEventType[]).filter(
    (tipo) => TIMELINE_TYPE_META[tipo].categoria === categoria,
  );
}
