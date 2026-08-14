import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Scale,
  Gavel,
  CalendarClock,
  Folder,
  Users,
  UserCog,
  Search,
  Bell,
  Sparkles,
  UserCircle,
  Settings2,
  FileSignature,
  HandCoins,
  ArrowLeftRight,
  ClipboardList,
  Newspaper,
  Clock,
  Briefcase,
  CheckSquare,
  Wallet,
  BarChart3,
  TrendingUp,
  PieChart,
  Landmark,
  Paperclip,
  History,
  FileDown,
  FileStack,
  BarChart2,
  LineChart,
  Settings,
  ListChecks,
  ListTree,
  Shapes,
  UsersRound,
  ClipboardCheck,
  CalendarDays,
  Coins,
  BrainCircuit,
  ShieldCheck,
  Kanban,
} from 'lucide-react';

/**
 * Reafirma docs/frontend/06-autorizacao.md §6.3 — item ausente (nunca
 * acinzentado) quando o usuário não tem nenhuma das permissões listadas em
 * `anyOfPermissions`. Ausência de `anyOfPermissions` significa "sempre
 * visível para qualquer usuário autenticado".
 *
 * A partir do Prompt 11 (Reorganização da Navegação — Sprint 12 na
 * numeração de docs/frontend-implementation/00-status.md), a Sidebar
 * passou de uma lista plana para grupos temáticos (`NavGroup`) — ver
 * §0.5.9 desse documento para a taxonomia completa e a justificativa de
 * cada item que aponta para uma rota real vs. uma rota `ComingSoon`
 * (módulo ainda não implementado).
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  anyOfPermissions?: string[];
}

export interface NavGroup {
  /** Ausente = grupo "utilitário" no topo, sem cabeçalho visual. */
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Busca', href: '/busca', icon: Search },
      {
        label: 'Assistente IA',
        href: '/assistente',
        icon: Sparkles,
        anyOfPermissions: ['ai:summarize'],
      },
      {
        label: 'Prazos',
        href: '/prazos',
        icon: CalendarClock,
        anyOfPermissions: ['case:read:all', 'case:read:team', 'case:read:assigned'],
      },
      { label: 'Notificações', href: '/notificacoes', icon: Bell },
    ],
  },
  {
    label: 'PESSOAS',
    items: [
      { label: 'Clientes', href: '/clientes', icon: Users, anyOfPermissions: ['client:read'] },
      {
        label: 'Colaboradores',
        href: '/colaboradores',
        icon: UserCog,
        anyOfPermissions: ['member:read'],
      },
    ],
  },
  {
    label: 'JURÍDICO',
    items: [
      {
        label: 'Configurações de captura',
        href: '/configuracoes-captura',
        icon: Settings2,
        anyOfPermissions: ['capture:read'],
      },
      { label: 'Contratos', href: '/contratos', icon: FileSignature },
      { label: 'Garantias', href: '/garantias', icon: HandCoins },
      {
        label: 'Movimentações extrajudiciais',
        href: '/movimentacoes-extrajudiciais',
        icon: ArrowLeftRight,
        anyOfPermissions: ['extrajudicial-movement:read'],
      },
      {
        label: 'Movimentações judiciais',
        href: '/movimentacoes-judiciais',
        icon: ArrowLeftRight,
        anyOfPermissions: ['movement:read'],
      },
      {
        label: 'Pastas',
        href: '/pastas',
        icon: Folder,
        anyOfPermissions: [
          'legal-folder:read:all',
          'legal-folder:read:team',
          'legal-folder:read:assigned',
        ],
      },
      { label: 'Pedidos', href: '/pedidos', icon: ClipboardList },
      { label: 'Processos extrajudiciais', href: '/processos-extrajudiciais', icon: Gavel },
      {
        label: 'Processos judiciais',
        href: '/processos-judiciais',
        icon: Scale,
        anyOfPermissions: ['case:read:all', 'case:read:team', 'case:read:assigned'],
      },
      {
        label: 'Publicações',
        href: '/publicacoes',
        icon: Newspaper,
        anyOfPermissions: ['publication:read'],
      },
    ],
  },
  {
    label: 'GESTÃO DO TEMPO',
    items: [
      { label: 'Registros de trabalho', href: '/registros-trabalho', icon: Clock },
      { label: 'Serviços', href: '/servicos', icon: Briefcase },
    ],
  },
  {
    label: 'TAREFAS',
    items: [
      {
        label: 'Minhas Tarefas',
        href: '/tarefas/minhas',
        icon: CheckSquare,
        anyOfPermissions: ['task:read:all', 'task:read:team', 'task:read:assigned'],
      },
      {
        label: 'Equipe',
        href: '/tarefas/equipe',
        icon: UsersRound,
        anyOfPermissions: ['task:read:all', 'task:read:team'],
      },
      {
        label: 'Kanban',
        href: '/tarefas/kanban',
        icon: Kanban,
        anyOfPermissions: ['task:read:all', 'task:read:team', 'task:read:assigned'],
      },
      {
        label: 'Calendário',
        href: '/tarefas/calendario',
        icon: CalendarDays,
        anyOfPermissions: ['task:read:all', 'task:read:team', 'task:read:assigned'],
      },
      {
        label: 'Templates',
        href: '/configuracoes/modelos-tarefa',
        icon: ClipboardCheck,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Categorias',
        href: '/configuracoes/categorias-tarefas',
        icon: ClipboardCheck,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Relatórios',
        href: '/tarefas/relatorios',
        icon: BarChart2,
        anyOfPermissions: ['task:read:all', 'task:read:team', 'task:read:assigned'],
      },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { label: 'Contas', href: '/financeiro/contas', icon: Wallet },
      { label: 'Demonstrativo de resultados', href: '/financeiro/dre', icon: BarChart3 },
      { label: 'Financeiro previsto', href: '/financeiro/previsto', icon: TrendingUp },
      { label: 'Financeiro realizado', href: '/financeiro/realizado', icon: PieChart },
      { label: 'Fluxo de caixa', href: '/financeiro/fluxo-caixa', icon: Landmark },
    ],
  },
  {
    label: 'OUTROS',
    items: [
      { label: 'Anexos', href: '/anexos', icon: Paperclip },
      { label: 'Auditoria', href: '/auditoria', icon: History },
      { label: 'Exportações de consultas', href: '/exportacoes', icon: FileDown },
      { label: 'Modelos de documentos', href: '/modelos-documentos', icon: FileStack },
    ],
  },
  {
    label: 'RELATÓRIOS',
    items: [
      { label: 'Relatórios básicos', href: '/relatorios/basicos', icon: BarChart2 },
      { label: 'Relatórios avançados', href: '/relatorios/avancados', icon: LineChart },
    ],
  },
  {
    label: 'CONFIGURAÇÕES',
    items: [
      {
        label: 'Geral',
        href: '/configuracoes',
        icon: Settings,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Campos Extras',
        href: '/configuracoes/campos-extras',
        icon: ListChecks,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Campos Obrigatórios',
        href: '/configuracoes/campos-obrigatorios',
        icon: Shapes,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Conjuntos de Valores',
        href: '/configuracoes/conjuntos-valores',
        icon: ListTree,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Categorias de Tarefas',
        href: '/configuracoes/categorias-tarefas',
        icon: ClipboardCheck,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Grupos de Colaboradores',
        href: '/configuracoes/grupos-colaboradores',
        icon: UsersRound,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Cargos',
        href: '/configuracoes/cargos',
        icon: UserCog,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Modelos de Tarefa',
        href: '/configuracoes/modelos-tarefa',
        icon: ClipboardCheck,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Feriados',
        href: '/configuracoes/feriados',
        icon: CalendarDays,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Financeiro',
        href: '/configuracoes/financeiro',
        icon: Coins,
        anyOfPermissions: ['financeiro:read'],
      },
      {
        label: 'Inteligência Artificial',
        href: '/configuracoes/ia',
        icon: BrainCircuit,
        anyOfPermissions: ['configuration:read'],
      },
      {
        label: 'Permissões',
        href: '/configuracoes/permissoes',
        icon: ShieldCheck,
        anyOfPermissions: ['office:update'],
      },
    ],
  },
];

export const secondaryNavItems: NavItem[] = [
  { label: 'Perfil', href: '/perfil', icon: UserCircle },
];
