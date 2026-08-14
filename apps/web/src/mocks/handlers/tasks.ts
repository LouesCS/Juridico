import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/tasks/`
 * (Task Engine, Prompt 14). Usados só em teste (Vitest); modo `dev:mock`
 * tem seu próprio conjunto em `mocks/demo/handlers.ts`. Status/Prioridade
 * são simulados como itens de Conjunto de Valores auto-provisionado (nunca
 * um enum fixo), mesmo contrato de `GET /tasks/config`.
 */
const base = env.NEXT_PUBLIC_API_URL;

function problem(status: number, code: string, detail: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, detail, code, correlationId: 'mock-correlation-id', timestamp: new Date(0).toISOString() },
    { status },
  );
}

interface ValueRef {
  id: string;
  valor: string;
}

interface CategoriaRef {
  id: string;
  nome: string;
  cor: string;
}

interface MembroRef {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

interface ChecklistItemMock {
  id: string;
  titulo: string;
  obrigatorio: boolean;
  ordem: number;
  concluidoEm: string | null;
}

interface VinculoMock {
  id: string;
  tipoRecurso: string;
  recursoId: string;
}

interface TaskMock {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: CategoriaRef | null;
  status: ValueRef | null;
  prioridade: ValueRef | null;
  responsavel: MembroRef | null;
  responsaveisAuxiliares: MembroRef[];
  equipeId: string | null;
  grupoColaboradoresId: string | null;
  dataInicio: string | null;
  dataVencimento: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  arquivadaEm: string | null;
  recorrenciaId: string | null;
  tarefaOrigemId: string | null;
  checklist: ChecklistItemMock[];
  vinculos: VinculoMock[];
  dependeDeIds: string[];
  favoritaPor: Set<string>;
  criadoPorId: string;
  criadoEm: string;
  atualizadoEm: string;
}

const STATUS_ITEMS: ValueRef[] = [
  { id: 'status-a-fazer', valor: 'A Fazer' },
  { id: 'status-fazendo', valor: 'Fazendo' },
  { id: 'status-concluidos', valor: 'Concluídos' },
  { id: 'status-cancelados', valor: 'Cancelados' },
];

const PRIORIDADE_ITEMS: ValueRef[] = [
  { id: 'prioridade-baixa', valor: 'Baixa' },
  { id: 'prioridade-media', valor: 'Média' },
  { id: 'prioridade-alta', valor: 'Alta' },
  { id: 'prioridade-critica', valor: 'Crítica' },
];

const CURRENT_MEMBRO: MembroRef = { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null };

let tasks: TaskMock[] = [];
let comments: Array<{ id: string; tarefaId: string; autorId: string; conteudo: string; criadoEm: string; editado: boolean }> = [];
let nextId = 1;

function generateId(prefix: string) {
  return `${prefix}-mock-${nextId++}`;
}

function initialTasks(): TaskMock[] {
  return [
    {
      id: 'tarefa-1',
      titulo: 'Protocolar contestação',
      descricao: 'Revisar minuta e protocolar no prazo.',
      categoria: { id: 'categoria-1', nome: 'Prazos Fatais', cor: '#EF4444' },
      status: STATUS_ITEMS[1],
      prioridade: PRIORIDADE_ITEMS[2],
      responsavel: CURRENT_MEMBRO,
      responsaveisAuxiliares: [],
      equipeId: null,
      grupoColaboradoresId: null,
      dataInicio: null,
      dataVencimento: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      concluidaEm: null,
      canceladaEm: null,
      motivoCancelamento: null,
      arquivadaEm: null,
      recorrenciaId: null,
      tarefaOrigemId: null,
      checklist: [
        { id: 'checklist-item-1', titulo: 'Revisar fatos', obrigatorio: true, ordem: 0, concluidoEm: null },
        { id: 'checklist-item-2', titulo: 'Anexar documentos', obrigatorio: false, ordem: 1, concluidoEm: null },
      ],
      vinculos: [],
      dependeDeIds: [],
      favoritaPor: new Set(),
      criadoPorId: 'mock-membro-1',
      criadoEm: '2026-07-20T00:00:00.000Z',
      atualizadoEm: '2026-07-20T00:00:00.000Z',
    },
    {
      id: 'tarefa-2',
      titulo: 'Enviar relatório mensal',
      descricao: null,
      categoria: null,
      status: STATUS_ITEMS[0],
      prioridade: PRIORIDADE_ITEMS[1],
      responsavel: { id: 'member-2', nome: 'Bruno Advogado', avatarUrl: null },
      responsaveisAuxiliares: [],
      equipeId: null,
      grupoColaboradoresId: null,
      dataInicio: null,
      dataVencimento: new Date(Date.now() - 86_400_000).toISOString(),
      concluidaEm: null,
      canceladaEm: null,
      motivoCancelamento: null,
      arquivadaEm: null,
      recorrenciaId: null,
      tarefaOrigemId: null,
      checklist: [],
      vinculos: [{ id: 'vinculo-tarefa-1', tipoRecurso: 'CLIENTE', recursoId: 'client-1' }],
      dependeDeIds: [],
      favoritaPor: new Set(['mock-membro-1']),
      criadoPorId: 'mock-membro-1',
      criadoEm: '2026-07-15T00:00:00.000Z',
      atualizadoEm: '2026-07-15T00:00:00.000Z',
    },
  ];
}

function seed() {
  tasks = initialTasks();
  comments = [];
  nextId = 1;
}

seed();

export function resetTaskMocks() {
  seed();
}

function toListItem(task: TaskMock, membroId: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return {
    id: task.id,
    titulo: task.titulo,
    categoria: task.categoria,
    status: task.status,
    prioridade: task.prioridade,
    responsavel: task.responsavel,
    dataVencimento: task.dataVencimento,
    concluidaEm: task.concluidaEm,
    canceladaEm: task.canceladaEm,
    arquivadaEm: task.arquivadaEm,
    favorita: task.favoritaPor.has(membroId),
    atrasada: !task.concluidaEm && !task.canceladaEm && !!task.dataVencimento && new Date(task.dataVencimento) < hoje,
  };
}

function toDetail(task: TaskMock, membroId: string) {
  return {
    id: task.id,
    titulo: task.titulo,
    descricao: task.descricao,
    categoria: task.categoria,
    status: task.status,
    prioridade: task.prioridade,
    responsavel: task.responsavel,
    responsaveisAuxiliares: task.responsaveisAuxiliares,
    equipeId: task.equipeId,
    grupoColaboradoresId: task.grupoColaboradoresId,
    dataInicio: task.dataInicio,
    dataVencimento: task.dataVencimento,
    concluidaEm: task.concluidaEm,
    canceladaEm: task.canceladaEm,
    motivoCancelamento: task.motivoCancelamento,
    arquivadaEm: task.arquivadaEm,
    recorrenciaId: task.recorrenciaId,
    tarefaOrigemId: task.tarefaOrigemId,
    checklist: task.checklist,
    vinculos: task.vinculos,
    dependencias: task.dependeDeIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is TaskMock => !!t)
      .map((t) => ({ id: t.id, titulo: t.titulo, concluidaEm: t.concluidaEm })),
    bloqueando: tasks
      .filter((t) => t.dependeDeIds.includes(task.id))
      .map((t) => ({ id: t.id, titulo: t.titulo, concluidaEm: t.concluidaEm })),
    favorita: task.favoritaPor.has(membroId),
    criadoPorId: task.criadoPorId,
    criadoEm: task.criadoEm,
    atualizadoEm: task.atualizadoEm,
  };
}

export const tasksHandlers = [
  http.get(`${base}/tasks/config`, () =>
    HttpResponse.json({
      status: STATUS_ITEMS.map((item, ordem) => ({ ...item, ordem })),
      prioridade: PRIORIDADE_ITEMS.map((item, ordem) => ({ ...item, ordem })),
    }),
  ),

  http.get(`${base}/tasks/dashboard-summary`, () => {
    const pendentes = tasks.filter((t) => !t.concluidaEm && !t.canceladaEm && !t.arquivadaEm);
    const atrasadas = pendentes.filter((t) => t.dataVencimento && new Date(t.dataVencimento) < new Date());
    const concluidas = tasks.filter((t) => t.concluidaEm);
    return HttpResponse.json({
      minhasTarefasPendentes: pendentes.filter((t) => t.responsavel?.id === 'mock-membro-1').length,
      equipeTarefasPendentes: pendentes.length,
      atrasadas: atrasadas.length,
      hoje: 0,
      proximas: pendentes.length,
      concluidasNoMes: concluidas.length,
      produtividade: {
        concluidas: concluidas.length,
        criadas: tasks.length,
        percentual: tasks.length > 0 ? Math.round((concluidas.length / tasks.length) * 100) : 0,
      },
    });
  }),

  http.get(`${base}/tasks`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const statusId = url.searchParams.get('statusId');
    const categoriaId = url.searchParams.get('categoriaId');
    const prioridadeId = url.searchParams.get('prioridadeId');
    const responsavelId = url.searchParams.get('responsavelId');
    const clienteId = url.searchParams.get('clienteId');
    const processoId = url.searchParams.get('processoId');
    const favoritas = url.searchParams.get('favoritas') === 'true';
    const concluidas = url.searchParams.get('concluidas') === 'true';
    const pendentes = url.searchParams.get('pendentes') === 'true';
    const atrasadas = url.searchParams.get('atrasadas') === 'true';

    let filtered = tasks;
    if (q) filtered = filtered.filter((t) => t.titulo.toLowerCase().includes(q));
    if (statusId) filtered = filtered.filter((t) => t.status?.id === statusId);
    if (categoriaId) filtered = filtered.filter((t) => t.categoria?.id === categoriaId);
    if (prioridadeId) filtered = filtered.filter((t) => t.prioridade?.id === prioridadeId);
    if (responsavelId) filtered = filtered.filter((t) => t.responsavel?.id === responsavelId);
    if (clienteId) filtered = filtered.filter((t) => t.vinculos.some((v) => v.tipoRecurso === 'CLIENTE' && v.recursoId === clienteId));
    if (processoId) filtered = filtered.filter((t) => t.vinculos.some((v) => v.tipoRecurso === 'PROCESSO' && v.recursoId === processoId));
    if (favoritas) filtered = filtered.filter((t) => t.favoritaPor.has('mock-membro-1'));
    if (concluidas) filtered = filtered.filter((t) => !!t.concluidaEm);
    if (pendentes) filtered = filtered.filter((t) => !t.concluidaEm && !t.canceladaEm && !t.arquivadaEm);
    if (atrasadas) {
      const hoje = new Date();
      filtered = filtered.filter((t) => !t.concluidaEm && !t.canceladaEm && t.dataVencimento && new Date(t.dataVencimento) < hoje);
    }

    return HttpResponse.json({ items: filtered.map((t) => toListItem(t, 'mock-membro-1')), nextCursor: null });
  }),

  http.post(`${base}/tasks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = generateId('tarefa');
    const checklist = ((body.checklist as Array<{ titulo: string; obrigatorio?: boolean; ordem?: number }>) ?? []).map(
      (item, index) => ({
        id: generateId('checklist-item'),
        titulo: item.titulo,
        obrigatorio: item.obrigatorio ?? false,
        ordem: item.ordem ?? index,
        concluidoEm: null,
      }),
    );
    const vinculos = ((body.vinculos as Array<{ tipoRecurso: string; recursoId: string }>) ?? []).map((v) => ({
      id: generateId('vinculo'),
      tipoRecurso: v.tipoRecurso,
      recursoId: v.recursoId,
    }));
    const novaTarefa: TaskMock = {
      id,
      titulo: (body.titulo as string) ?? 'Nova tarefa',
      descricao: (body.descricao as string) ?? null,
      categoria: null,
      status: STATUS_ITEMS.find((s) => s.id === body.statusId) ?? STATUS_ITEMS[0],
      prioridade: PRIORIDADE_ITEMS.find((p) => p.id === body.prioridadeId) ?? PRIORIDADE_ITEMS[1],
      responsavel: body.responsavelPrincipalId ? CURRENT_MEMBRO : null,
      responsaveisAuxiliares: [],
      equipeId: (body.equipeId as string) ?? null,
      grupoColaboradoresId: (body.grupoColaboradoresId as string) ?? null,
      dataInicio: (body.dataInicio as string) ?? null,
      dataVencimento: (body.dataVencimento as string) ?? null,
      concluidaEm: null,
      canceladaEm: null,
      motivoCancelamento: null,
      arquivadaEm: null,
      recorrenciaId: body.recorrencia ? generateId('recorrencia') : null,
      tarefaOrigemId: null,
      checklist,
      vinculos,
      dependeDeIds: (body.dependeDeIds as string[]) ?? [],
      favoritaPor: new Set(),
      criadoPorId: 'mock-membro-1',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    tasks = [novaTarefa, ...tasks];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.post(`${base}/tasks/from-template`, async ({ request }) => {
    const body = (await request.json()) as { modeloId?: string; responsavelPrincipalId?: string };
    const id = generateId('tarefa');
    tasks = [
      {
        id,
        titulo: 'Contestação Padrão',
        descricao: null,
        categoria: { id: 'categoria-1', nome: 'Prazos Fatais', cor: '#EF4444' },
        status: STATUS_ITEMS[0],
        prioridade: PRIORIDADE_ITEMS[2],
        responsavel: body.responsavelPrincipalId ? CURRENT_MEMBRO : null,
        responsaveisAuxiliares: [],
        equipeId: null,
        grupoColaboradoresId: null,
        dataInicio: null,
        dataVencimento: new Date(Date.now() + 15 * 86_400_000).toISOString(),
        concluidaEm: null,
        canceladaEm: null,
        motivoCancelamento: null,
        arquivadaEm: null,
        recorrenciaId: null,
        tarefaOrigemId: null,
        checklist: ['Revisar fatos', 'Anexar documentos'].map((titulo, ordem) => ({
          id: generateId('checklist-item'),
          titulo,
          obrigatorio: false,
          ordem,
          concluidoEm: null,
        })),
        vinculos: [],
        dependeDeIds: [],
        favoritaPor: new Set(),
        criadoPorId: 'mock-membro-1',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
      ...tasks,
    ];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.get(`${base}/tasks/:id`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    return HttpResponse.json(toDetail(task, 'mock-membro-1'));
  }),

  http.patch(`${base}/tasks/:id`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as Record<string, unknown>;
    if ('titulo' in body) task.titulo = body.titulo as string;
    if ('descricao' in body) task.descricao = body.descricao as string | null;
    if ('statusId' in body) task.status = STATUS_ITEMS.find((s) => s.id === body.statusId) ?? null;
    if ('prioridadeId' in body) task.prioridade = PRIORIDADE_ITEMS.find((p) => p.id === body.prioridadeId) ?? null;
    if ('dataInicio' in body) task.dataInicio = body.dataInicio as string | null;
    if ('dataVencimento' in body) task.dataVencimento = body.dataVencimento as string | null;
    task.atualizadoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:id`, ({ params }) => {
    tasks = tasks.filter((t) => t.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/archive`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    task.arquivadaEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/restore`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    task.arquivadaEm = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/duplicate`, ({ params }) => {
    const original = tasks.find((t) => t.id === params.id);
    if (!original) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const id = generateId('tarefa');
    tasks = [
      {
        ...original,
        id,
        titulo: `${original.titulo} (cópia)`,
        favoritaPor: new Set(),
        concluidaEm: null,
        canceladaEm: null,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
      ...tasks,
    ];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.post(`${base}/tasks/:id/move`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as { statusId: string | null };
    task.status = STATUS_ITEMS.find((s) => s.id === body.statusId) ?? null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/reopen`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    task.concluidaEm = null;
    task.canceladaEm = null;
    task.motivoCancelamento = null;
    task.status = STATUS_ITEMS[1];
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/complete`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const dependenciasPendentes = task.dependeDeIds
      .map((id) => tasks.find((t) => t.id === id))
      .some((t) => t && !t.concluidaEm);
    if (dependenciasPendentes) return problem(409, 'TASK_DEPENDENCIES_PENDING', 'Existem dependências pendentes.');
    const checklistObrigatorioPendente = task.checklist.some((item) => item.obrigatorio && !item.concluidoEm);
    if (checklistObrigatorioPendente) return problem(409, 'TASK_CHECKLIST_PENDING', 'Existem itens obrigatórios pendentes.');
    task.concluidaEm = new Date().toISOString();
    task.status = STATUS_ITEMS[2];
    return HttpResponse.json({ proximaOcorrenciaId: null });
  }),

  http.post(`${base}/tasks/:id/cancel`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as { motivo?: string };
    task.canceladaEm = new Date().toISOString();
    task.motivoCancelamento = body.motivo ?? task.motivoCancelamento;
    task.status = STATUS_ITEMS[3];
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/favorite`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.id);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const membroId = 'mock-membro-1';
    if (task.favoritaPor.has(membroId)) {
      task.favoritaPor.delete(membroId);
      return HttpResponse.json({ favorita: false });
    }
    task.favoritaPor.add(membroId);
    return HttpResponse.json({ favorita: true });
  }),

  http.post(`${base}/tasks/:tarefaId/checklist`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as { titulo: string; obrigatorio?: boolean; ordem?: number };
    const id = generateId('checklist-item');
    task.checklist.push({ id, titulo: body.titulo, obrigatorio: body.obrigatorio ?? false, ordem: body.ordem ?? task.checklist.length, concluidoEm: null });
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.patch(`${base}/tasks/:tarefaId/checklist/:itemId`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    const item = task?.checklist.find((i) => i.id === params.itemId);
    if (!item) return problem(404, 'NOT_FOUND', 'Item de checklist não encontrado.');
    const body = (await request.json()) as { titulo?: string; obrigatorio?: boolean; ordem?: number; concluido?: boolean };
    if (body.titulo !== undefined) item.titulo = body.titulo;
    if (body.obrigatorio !== undefined) item.obrigatorio = body.obrigatorio;
    if (body.ordem !== undefined) item.ordem = body.ordem;
    if (body.concluido !== undefined) item.concluidoEm = body.concluido ? new Date().toISOString() : null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:tarefaId/checklist/:itemId`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    task.checklist = task.checklist.filter((i) => i.id !== params.itemId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:tarefaId/dependencies`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as { dependeDeId: string };
    if (!task.dependeDeIds.includes(body.dependeDeId)) task.dependeDeIds.push(body.dependeDeId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:tarefaId/dependencies/:dependeDeId`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    task.dependeDeIds = task.dependeDeIds.filter((id) => id !== params.dependeDeId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:tarefaId/links`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as { tipoRecurso: string; recursoId: string };
    const id = generateId('vinculo');
    task.vinculos.push({ id, tipoRecurso: body.tipoRecurso, recursoId: body.recursoId });
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.delete(`${base}/tasks/:tarefaId/links/:vinculoId`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    task.vinculos = task.vinculos.filter((v) => v.id !== params.vinculoId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:tarefaId/responsibles`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as { membroId: string };
    if (!task.responsaveisAuxiliares.some((m) => m.id === body.membroId)) {
      task.responsaveisAuxiliares.push({ id: body.membroId, nome: 'Membro Adicionado', avatarUrl: null });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:tarefaId/responsibles/:membroId`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    task.responsaveisAuxiliares = task.responsaveisAuxiliares.filter((m) => m.id !== params.membroId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/tasks/:tarefaId/comments`, ({ params }) => {
    return HttpResponse.json(comments.filter((c) => c.tarefaId === params.tarefaId));
  }),

  http.post(`${base}/tasks/:tarefaId/comments`, async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    const body = (await request.json()) as { conteudo: string };
    const id = generateId('comentario');
    comments.push({ id, tarefaId: params.tarefaId as string, autorId: 'mock-membro-1', conteudo: body.conteudo, criadoEm: new Date().toISOString(), editado: false });
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.get(`${base}/tasks/:tarefaId/timeline`, ({ params }) => {
    const task = tasks.find((t) => t.id === params.tarefaId);
    if (!task) return problem(404, 'NOT_FOUND', 'Tarefa não encontrada.');
    return HttpResponse.json({
      items: [
        {
          id: `evento-${task.id}-1`,
          tipo: 'CRIACAO_TAREFA',
          titulo: `Tarefa "${task.titulo}" criada`,
          descricao: null,
          dataEvento: task.criadoEm,
          origem: 'SISTEMA',
          autor: { id: task.criadoPorId, nome: 'Usuária' },
          entidadeRelacionada: null,
          fixado: false,
          editavel: false,
        },
      ],
      nextCursor: null,
    });
  }),
];
