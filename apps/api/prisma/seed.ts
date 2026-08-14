/**
 * Seed idempotente (upsert por chave estável) — reafirma
 * docs/database/11-prisma-migracoes-seed.md §11.14. Papéis e permissões de
 * sistema são semeados em TODOS os ambientes, incluindo produção; dados
 * fictícios (escritório demo, usuários/clientes/processos fictícios) ficam
 * marcados abaixo e só devem rodar fora de produção.
 *
 * Nenhum dado pessoal real é usado — reafirma restrição explícita da etapa.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PermissaoSeed {
  chave: string;
  recurso: string;
  acao: string;
  escopo: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN';
  categoria: string;
  descricao: string;
}

const PERMISSOES: PermissaoSeed[] = [
  {
    chave: 'office:read',
    recurso: 'office',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Escritório',
    descricao: 'Visualizar dados do escritório',
  },
  {
    chave: 'office:update',
    recurso: 'office',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Escritório',
    descricao: 'Atualizar dados do escritório',
  },
  {
    chave: 'office:delete',
    recurso: 'office',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Escritório',
    descricao: 'Encerrar o escritório',
  },

  {
    chave: 'member:read',
    recurso: 'member',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Listar membros',
  },
  {
    chave: 'member:invite',
    recurso: 'member',
    acao: 'invite',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Convidar novo membro',
  },
  {
    chave: 'member:remove',
    recurso: 'member',
    acao: 'remove',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Desativar membro',
  },
  {
    chave: 'member:update-role',
    recurso: 'member',
    acao: 'update-role',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Alterar papel de um membro',
  },

  // Adicionadas no módulo Colaboradores — cadastro rico de `Membro`
  // (docs/backend-implementation, sprint "Módulo Colaboradores"). Duas ações
  // do catálogo original deliberadamente NÃO ganham chave nova aqui: excluir
  // um colaborador reaproveita `member:remove` (já existente, mesmo
  // significado — soft-delete/desativação) e alterar permissões/papel
  // reaproveita `role:manage` (Permission Engine, Prompt 12) — nenhuma das
  // duas precisa de uma chave `member:*` própria.
  {
    chave: 'member:create',
    recurso: 'member',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Cadastrar colaborador',
  },
  {
    chave: 'member:update',
    recurso: 'member',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Editar dados do colaborador',
  },
  {
    chave: 'member:block',
    recurso: 'member',
    acao: 'block',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Bloquear, desbloquear, suspender e reativar acesso do colaborador',
  },
  {
    chave: 'member:manage-access',
    recurso: 'member',
    acao: 'manage-access',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Conceder/remover acesso ao sistema e revogar sessões do colaborador',
  },
  {
    chave: 'member:export',
    recurso: 'member',
    acao: 'export',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Exportar lista de colaboradores',
  },
  {
    chave: 'member:view-administrative-data',
    recurso: 'member',
    acao: 'view-administrative-data',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Ver dados administrativos do colaborador — CPF, RG, OAB, anotações',
  },

  { chave: 'request:create', recurso: 'request', acao: 'create', escopo: 'ALL', categoria: 'Pedidos', descricao: 'Criar Pedido dentro da Pasta Jurídica' },
  { chave: 'request:read', recurso: 'request', acao: 'read', escopo: 'ALL', categoria: 'Pedidos', descricao: 'Visualizar Pedidos' },
  { chave: 'request:update', recurso: 'request', acao: 'update', escopo: 'ALL', categoria: 'Pedidos', descricao: 'Editar Pedidos' },
  { chave: 'request:delete', recurso: 'request', acao: 'delete', escopo: 'ALL', categoria: 'Pedidos', descricao: 'Remover Pedidos' },
  { chave: 'request:export', recurso: 'request', acao: 'export', escopo: 'ALL', categoria: 'Pedidos', descricao: 'Exportar Pedidos' },
  {
    chave: 'client:create',
    recurso: 'client',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Cadastrar cliente',
  },
  {
    chave: 'client:read',
    recurso: 'client',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Visualizar clientes',
  },
  {
    chave: 'client:update',
    recurso: 'client',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Editar cliente',
  },
  {
    chave: 'client:delete',
    recurso: 'client',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Excluir cliente',
  },
  {
    chave: 'client:export',
    recurso: 'client',
    acao: 'export',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Exportar lista de clientes (CSV)',
  },

  {
    chave: 'case:create',
    recurso: 'case',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Processos',
    descricao: 'Criar processo',
  },
  {
    chave: 'case:read:all',
    recurso: 'case',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Processos',
    descricao: 'Ver todos os processos do escritório',
  },
  {
    chave: 'case:read:team',
    recurso: 'case',
    acao: 'read',
    escopo: 'TEAM',
    categoria: 'Processos',
    descricao: 'Ver processos da equipe',
  },
  {
    chave: 'case:read:assigned',
    recurso: 'case',
    acao: 'read',
    escopo: 'ASSIGNED',
    categoria: 'Processos',
    descricao: 'Ver processos atribuídos',
  },
  {
    chave: 'case:update',
    recurso: 'case',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Processos',
    descricao: 'Editar processo',
  },
  {
    chave: 'case:delete',
    recurso: 'case',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Processos',
    descricao: 'Excluir processo',
  },
  {
    chave: 'case:team:manage',
    recurso: 'case',
    acao: 'team:manage',
    escopo: 'ALL',
    categoria: 'Processos',
    descricao: 'Gerenciar equipe do processo',
  },
  {
    chave: 'case:read:confidential',
    recurso: 'case',
    acao: 'read:confidential',
    escopo: 'ALL',
    categoria: 'Processos',
    descricao: 'Ver processos em segredo de justiça',
  },

  {
    chave: 'document:create',
    recurso: 'document',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Documentos',
    descricao: 'Enviar documento',
  },
  {
    chave: 'document:read:all',
    recurso: 'document',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Documentos',
    descricao: 'Ver todos os documentos',
  },
  {
    chave: 'document:read:assigned',
    recurso: 'document',
    acao: 'read',
    escopo: 'ASSIGNED',
    categoria: 'Documentos',
    descricao: 'Ver documentos de processos atribuídos',
  },
  // Adicionada na Sprint 09 (Documentos e Pastas) — o catálogo original
  // (docs/api/03-autorizacao.md §3.8) não previa uma permissão distinta para
  // editar metadados/mover/favoritar/duplicar um documento já existente;
  // achado real, corrigido seguindo o mesmo padrão de `case:update`.
  {
    chave: 'document:update',
    recurso: 'document',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Documentos',
    descricao: 'Editar, mover, duplicar ou favoritar documento',
  },
  {
    chave: 'document:download',
    recurso: 'document',
    acao: 'download',
    escopo: 'ALL',
    categoria: 'Documentos',
    descricao: 'Baixar documento',
  },
  {
    chave: 'document:delete',
    recurso: 'document',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Documentos',
    descricao: 'Excluir documento',
  },
  {
    chave: 'document:folder:manage',
    recurso: 'document',
    acao: 'folder:manage',
    escopo: 'ALL',
    categoria: 'Documentos',
    descricao: 'Gerenciar pastas',
  },
  {
    chave: 'legal-folder:read:all',
    recurso: 'legal-folder',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Pastas Jurídicas',
    descricao: 'Ver todas as Pastas Jurídicas',
  },
  {
    chave: 'legal-folder:read:team',
    recurso: 'legal-folder',
    acao: 'read',
    escopo: 'TEAM',
    categoria: 'Pastas Jurídicas',
    descricao: 'Ver Pastas Jurídicas da equipe',
  },
  {
    chave: 'legal-folder:read:assigned',
    recurso: 'legal-folder',
    acao: 'read',
    escopo: 'ASSIGNED',
    categoria: 'Pastas Jurídicas',
    descricao: 'Ver Pastas Jurídicas atribuídas',
  },
  {
    chave: 'legal-folder:create',
    recurso: 'legal-folder',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Pastas Jurídicas',
    descricao: 'Criar Pastas Jurídicas',
  },
  {
    chave: 'legal-folder:update',
    recurso: 'legal-folder',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Pastas Jurídicas',
    descricao: 'Editar Pastas Jurídicas',
  },
  {
    chave: 'legal-folder:delete',
    recurso: 'legal-folder',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Pastas Jurídicas',
    descricao: 'Arquivar Pastas Jurídicas',
  },

  {
    chave: 'comment:create',
    recurso: 'comment',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Comentários',
    descricao: 'Comentar',
  },
  {
    chave: 'comment:delete',
    recurso: 'comment',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Comentários',
    descricao: 'Excluir comentário de terceiro',
  },
  {
    chave: 'tag:manage',
    recurso: 'tag',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'Tags',
    descricao: 'Gerenciar tags do escritório',
  },

  {
    chave: 'ai:summarize',
    recurso: 'ai',
    acao: 'summarize',
    escopo: 'ALL',
    categoria: 'IA',
    descricao: 'Gerar resumo por IA',
  },
  {
    chave: 'ai:usage:read',
    recurso: 'ai',
    acao: 'usage:read',
    escopo: 'ALL',
    categoria: 'IA',
    descricao: 'Ver custo e uso de IA do escritório',
  },

  {
    chave: 'notification:manage',
    recurso: 'notification',
    acao: 'manage',
    escopo: 'OWN',
    categoria: 'Notificações',
    descricao: 'Gerenciar as próprias notificações',
  },
  {
    chave: 'audit:read',
    recurso: 'audit',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Auditoria',
    descricao: 'Consultar trilha de auditoria',
  },

  // Adicionadas no Prompt 12 (Permission Engine) — catálogo central de
  // autorização; nenhum módulo pode mais criar uma permissão própria fora
  // daqui (ver docs/backend-implementation/21-permission-engine.md).
  {
    chave: 'role:manage',
    recurso: 'role',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'Administração',
    descricao: 'Criar e editar perfis (papéis) e suas permissões',
  },
  {
    chave: 'simulation:use',
    recurso: 'simulation',
    acao: 'use',
    escopo: 'ALL',
    categoria: 'Administração',
    descricao: 'Simular a navegação de outro membro (Simulador)',
  },
  {
    chave: 'client:read:sensitive',
    recurso: 'client',
    acao: 'read:sensitive',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Ver CPF/CNPJ e endereço completos do cliente (dado sigiloso)',
  },
  {
    chave: 'report:metrics:read',
    recurso: 'report',
    acao: 'metrics:read',
    escopo: 'ALL',
    categoria: 'Relatórios',
    descricao: 'Ver indicadores/métricas do escritório (ex.: card de portfólio do Dashboard)',
  },
  // As 3 chaves abaixo já fazem parte do catálogo oficial (Prompt 12
  // §Módulos/§Ações) mas NENHUM módulo de negócio as aplica ainda — não
  // existe Financeiro/Honorários no schema (Prompt 12 pede explicitamente
  // para não implementar módulos de negócio nesta rodada). Pré-cadastradas
  // para que o futuro módulo Financeiro nasça consumindo o Permission
  // Engine em vez de inventar permissões próprias — documentado como
  // catálogo-apenas em docs/backend-implementation/21-permission-engine.md.
  {
    chave: 'financeiro:read',
    recurso: 'financeiro',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Financeiro',
    descricao: '(catálogo, sem módulo ainda) Ver dados financeiros do escritório',
  },
  {
    chave: 'financeiro:honorarios:read',
    recurso: 'financeiro',
    acao: 'honorarios:read',
    escopo: 'ALL',
    categoria: 'Financeiro',
    descricao: '(catálogo, sem módulo ainda) Ver honorários',
  },
  {
    chave: 'financeiro:salarios:read',
    recurso: 'financeiro',
    acao: 'salarios:read',
    escopo: 'ALL',
    categoria: 'Financeiro',
    descricao: '(catálogo, sem módulo ainda) Ver salários da equipe',
  },

  // Adicionadas no Prompt 13 (Configuration Engine) — motor central de
  // parametrização (ver docs/backend-implementation/22-configuration-engine.md).
  // Duas chaves cobrem todos os sub-recursos (Campos Extras, Campos
  // Obrigatórios, Conjuntos de Valores, Categorias de Tarefas, Grupos de
  // Colaboradores, Modelos de Tarefa, Feriados, Geral) — mesmo padrão de
  // `role:manage` cobrindo todo o módulo de Perfis no Prompt 12, evita
  // explosão de permissões por sub-tela. A aba Financeiro exige
  // adicionalmente `financeiro:read` (checado dentro do use case, "etapa 2"
  // de docs/backend/06-autorizacao.md §6.1); a aba IA exige `ai:manage`.
  {
    chave: 'configuration:read',
    recurso: 'configuration',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Configurações',
    descricao:
      'Visualizar as telas do Configuration Engine (Geral, Campos Extras, Conjuntos de Valores, Categorias, Grupos, Modelos, Feriados)',
  },
  {
    chave: 'configuration:manage',
    recurso: 'configuration',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'Configurações',
    descricao: 'Criar, editar e excluir qualquer sub-recurso do Configuration Engine',
  },
  {
    chave: 'capture:read',
    recurso: 'capture',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Configurações de Captura',
    descricao: 'Visualizar configurações e histórico de captura judicial',
  },
  {
    chave: 'capture:create',
    recurso: 'capture',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Configurações de Captura',
    descricao: 'Criar configuração de captura judicial',
  },
  {
    chave: 'capture:update',
    recurso: 'capture',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Configurações de Captura',
    descricao: 'Editar, ativar e pausar captura judicial',
  },
  {
    chave: 'capture:delete',
    recurso: 'capture',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Configurações de Captura',
    descricao: 'Excluir apenas a configuração de acompanhamento',
  },
  {
    chave: 'capture:sync',
    recurso: 'capture',
    acao: 'sync',
    escopo: 'ALL',
    categoria: 'Configurações de Captura',
    descricao: 'Executar sincronização judicial manual',
  },
  {
    chave: 'capture:manage',
    recurso: 'capture',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'Configurações de Captura',
    descricao: 'Administrar configurações de captura judicial',
  },
  {
    chave: 'publication:read',
    recurso: 'publication',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Publicações',
    descricao: 'Visualizar publicações capturadas',
  },
  {
    chave: 'publication:update',
    recurso: 'publication',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Publicações',
    descricao: 'Marcar leitura e favoritar publicações',
  },
  {
    chave: 'publication:delete',
    recurso: 'publication',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Publicações',
    descricao: 'Excluir publicação normalizada',
  },
  {
    chave: 'publication:manage',
    recurso: 'publication',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'Publicações',
    descricao: 'Administrar e exportar publicações',
  },
  {
    chave: 'movement:read',
    recurso: 'movement',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Movimentações Judiciais',
    descricao: 'Visualizar movimentações judiciais capturadas',
  },
  {
    chave: 'movement:update',
    recurso: 'movement',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Movimentações Judiciais',
    descricao: 'Favoritar movimentações judiciais',
  },
  {
    chave: 'movement:manage',
    recurso: 'movement',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'Movimentações Judiciais',
    descricao: 'Administrar e exportar movimentações judiciais',
  },
  ...['read', 'create', 'update', 'delete', 'manage'].map((acao) => ({
    chave: `extrajudicial-movement:${acao}`,
    recurso: 'extrajudicial-movement',
    acao,
    escopo: 'ALL' as const,
    categoria: 'Movimentações Extrajudiciais',
    descricao: `${acao} movimentações extrajudiciais`,
  })),
  {
    chave: 'ai:manage',
    recurso: 'ai',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'IA',
    descricao: 'Configurar provider padrão, modelo e cota mensal personalizada de IA do escritório',
  },

  // Adicionadas no Prompt 14 (Task Engine) — mesmo formato Módulo/Ação/
  // Escopo/Categoria de `case:*` (docs/backend-implementation/23-task-engine.md
  // §23.5). Favoritar uma tarefa não ganhou permissão própria — reaproveita
  // `task:read:assigned` (quem consegue ver a tarefa consegue favoritá-la).
  {
    chave: 'task:create',
    recurso: 'task',
    acao: 'create',
    escopo: 'ALL',
    categoria: 'Tarefas',
    descricao: 'Criar tarefa',
  },
  {
    chave: 'task:read:all',
    recurso: 'task',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Tarefas',
    descricao: 'Ver todas as tarefas do escritório',
  },
  {
    chave: 'task:read:team',
    recurso: 'task',
    acao: 'read',
    escopo: 'TEAM',
    categoria: 'Tarefas',
    descricao: 'Ver tarefas da equipe',
  },
  {
    chave: 'task:read:assigned',
    recurso: 'task',
    acao: 'read',
    escopo: 'ASSIGNED',
    categoria: 'Tarefas',
    descricao: 'Ver tarefas atribuídas a mim',
  },
  {
    chave: 'task:update',
    recurso: 'task',
    acao: 'update',
    escopo: 'ALL',
    categoria: 'Tarefas',
    descricao: 'Editar, mover, concluir, cancelar e arquivar tarefa',
  },
  {
    chave: 'task:delete',
    recurso: 'task',
    acao: 'delete',
    escopo: 'ALL',
    categoria: 'Tarefas',
    descricao: 'Excluir e restaurar tarefa',
  },
  {
    chave: 'task:team:manage',
    recurso: 'task',
    acao: 'team:manage',
    escopo: 'ALL',
    categoria: 'Tarefas',
    descricao: 'Gerenciar responsáveis/equipe de qualquer tarefa',
  },
];

/**
 * Reafirma docs/database/08-permissoes-seguranca.md §8.3.
 *
 * Permission Engine (Prompt 12) — `ADMIN_RESTRITAS`/`SOCIO_RESTRITAS`:
 * chaves que o catálogo Prompt 12 §ADMIN pede explicitamente que fiquem a
 * critério do OWNER conceder caso a caso ("O OWNER poderá decidir se o
 * ADMIN poderá visualizar Financeiro/Honorários/Salários/Custos IA/Logs/
 * Auditoria/..."). Ficam de fora do papel por padrão; o OWNER concede via
 * `PermissaoUsuario` (efeito CONCEDER) usando a tela administrativa nova
 * (`modules/permissions/`) — nunca editando este seed.
 */
const ADMIN_SOCIO_RESTRITAS = [
  'role:manage',
  'simulation:use',
  'audit:read',
  'financeiro:read',
  'financeiro:honorarios:read',
  'financeiro:salarios:read',
  'member:view-administrative-data',
];

const PAPEL_PERMISSOES: Record<string, string[]> = {
  OWNER: PERMISSOES.map((p) => p.chave),
  ADMIN: PERMISSOES.filter(
    (p) =>
      ![
        'office:delete',
        'case:read:confidential',
        'ai:summarize',
        ...ADMIN_SOCIO_RESTRITAS,
      ].includes(p.chave),
  ).map((p) => p.chave),
  SOCIO: PERMISSOES.filter(
    (p) =>
      ![
        'office:update',
        'office:delete',
        'member:remove',
        'member:update-role',
        ...ADMIN_SOCIO_RESTRITAS,
      ].includes(p.chave),
  ).map((p) => p.chave),
  ADVOGADO: [
    'office:read',
    'member:read',
    'client:create',
    'client:read',
    'client:read:sensitive',
    'client:update',
    'client:export',
    'case:create',
    'case:read:assigned',
    'case:read:team',
    'case:update',
    'case:team:manage',
    'case:read:confidential',
    'document:create',
    'document:read:assigned',
    'document:update',
    'document:download',
    'document:delete',
    'document:folder:manage',
    'legal-folder:create',
    'legal-folder:read:assigned',
    'legal-folder:read:team',
    'legal-folder:update',
    'comment:create',
    'tag:manage',
    'ai:summarize',
    'notification:manage',
    'task:create',
    'task:read:assigned',
    'task:read:team',
    'task:update',
    'task:delete',
    'task:team:manage',
  ],
  ASSISTENTE: [
    'office:read',
    'member:read',
    'client:create',
    'client:read',
    'client:read:sensitive',
    'client:update',
    'client:export',
    'case:create',
    'case:update',
    'document:create',
    'document:read:all',
    'document:update',
    'document:download',
    'document:folder:manage',
    'legal-folder:create',
    'legal-folder:read:all',
    'legal-folder:update',
    'comment:create',
    'notification:manage',
    'task:create',
    'task:read:all',
    'task:update',
  ],
  ESTAGIARIO: [
    'office:read',
    'member:read',
    'client:read',
    'case:read:assigned',
    'document:read:assigned',
    'document:download',
    'legal-folder:read:assigned',
    'comment:create',
    'ai:summarize',
    'notification:manage',
    'task:read:assigned',
    'task:update',
  ],
  // Perfis novos do Prompt 12 — "Todo perfil deverá ser totalmente
  // configurável": estes dois ganham um conjunto inicial curado (mesmo
  // padrão dos demais papéis de sistema), mas nada os torna especiais —
  // um OWNER pode ajustar as permissões de qualquer um pela tela
  // administrativa nova, exatamente como faria com um perfil customizado.
  GESTOR: [
    'office:read',
    'member:read',
    'client:create',
    'client:read',
    'client:read:sensitive',
    'client:update',
    'client:export',
    'case:create',
    'case:read:all',
    'case:update',
    'case:team:manage',
    'document:read:all',
    'document:download',
    'report:metrics:read',
    'audit:read',
    'notification:manage',
    'configuration:read',
    'task:create',
    'task:read:all',
    'task:update',
    'task:delete',
    'task:team:manage',
  ],
  FINANCEIRO: [
    'office:read',
    'member:read',
    'client:read',
    'client:read:sensitive',
    'case:read:all',
    'financeiro:read',
    'financeiro:honorarios:read',
    'financeiro:salarios:read',
    'report:metrics:read',
    'notification:manage',
    'configuration:read',
    'task:read:assigned',
    'task:update',
  ],
};

const PAPEIS_SISTEMA: Array<{ nome: string; descricao: string; nivel: number }> = [
  { nome: 'OWNER', descricao: 'Titular do escritório', nivel: 100 },
  { nome: 'ADMIN', descricao: 'Administração do escritório', nivel: 90 },
  { nome: 'SOCIO', descricao: 'Sócio do escritório', nivel: 80 },
  { nome: 'GESTOR', descricao: 'Gestão operacional (equipe, carteira, indicadores)', nivel: 70 },
  { nome: 'ADVOGADO', descricao: 'Advogado', nivel: 60 },
  { nome: 'FINANCEIRO', descricao: 'Financeiro do escritório', nivel: 50 },
  { nome: 'ASSISTENTE', descricao: 'Assistente jurídico', nivel: 40 },
  { nome: 'ESTAGIARIO', descricao: 'Estagiário', nivel: 20 },
];

async function seedPermissoesEPapeis() {
  for (const permissao of PERMISSOES) {
    await prisma.permissao.upsert({
      where: { chave: permissao.chave },
      update: permissao,
      create: permissao,
    });
  }

  for (const papel of PAPEIS_SISTEMA) {
    const registro = await prisma.papel.upsert({
      where: { id: await resolvePapelSistemaId(papel.nome) },
      update: { descricao: papel.descricao, nivel: papel.nivel },
      create: { nome: papel.nome, descricao: papel.descricao, nivel: papel.nivel, ehSistema: true },
    });

    const chaves = PAPEL_PERMISSOES[papel.nome] ?? [];
    for (const chave of chaves) {
      const permissao = await prisma.permissao.findUniqueOrThrow({ where: { chave } });
      await prisma.papelPermissao.upsert({
        where: { papelId_permissaoId: { papelId: registro.id, permissaoId: permissao.id } },
        update: {},
        create: { papelId: registro.id, permissaoId: permissao.id },
      });
    }
  }
}

/** Prisma não tem upsert por campo não-único (nome+ehSistema) — resolve o id existente, se houver. */
async function resolvePapelSistemaId(nome: string): Promise<string> {
  const existente = await prisma.papel.findFirst({ where: { nome, ehSistema: true } });
  return existente?.id ?? '00000000-0000-0000-0000-000000000000';
}

async function seedDemo() {
  if (process.env.NODE_ENV === 'production') {
    console.log('NODE_ENV=production — pulando dados fictícios de demonstração.');
    return;
  }

  const owner = PAPEIS_SISTEMA[0];
  const papelOwner = await prisma.papel.findFirstOrThrow({
    where: { nome: owner.nome, ehSistema: true },
  });

  const escritorio = await prisma.escritorio.upsert({
    where: { slug: 'escritorio-demonstrativo' },
    update: {},
    create: {
      nomeFantasia: 'Escritório Demonstrativo',
      slug: 'escritorio-demonstrativo',
      email: 'demo@quilombodev.invalid',
      status: 'ATIVO',
      plano: 'PROFISSIONAL',
    },
  });

  await prisma.prefixoPastaJuridica.upsert({
    where: { escritorioId_prefixo: { escritorioId: escritorio.id, prefixo: 'GERAL' } },
    update: { ativo: true },
    create: { escritorioId: escritorio.id, prefixo: 'GERAL', nome: 'Geral' },
  });

  console.log(
    `Seed de demonstração pronto: escritório "${escritorio.nomeFantasia}" (${escritorio.id}).`,
  );
  console.log(
    `Papel OWNER disponível: ${papelOwner.id}. Crie o primeiro usuário via POST /api/v1/auth/register.`,
  );
}

async function main() {
  await seedPermissoesEPapeis();
  await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
