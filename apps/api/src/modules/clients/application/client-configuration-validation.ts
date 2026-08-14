import { z } from 'zod';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
type ClientData = Record<string, unknown> & { camposExtrasValores?: Record<string, string> };

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isFilled);
  if (value === null || value === undefined) return false;
  return typeof value !== 'string' || value.trim().length > 0;
}

function isRelevant(field: string, tipo: unknown): boolean {
  const onlyPf = new Set([
    'cpf',
    'rg',
    'nomeSocial',
    'nomeMae',
    'nomePai',
    'estadoCivil',
    'profissao',
    'dataNascimento',
    'telefoneResidencial',
  ]);
  const onlyPj = new Set(['cnpj', 'razaoSocial', 'responsavelNome', 'telefoneResponsavel']);
  return tipo === 'PESSOA_FISICA' ? !onlyPj.has(field) : !onlyPf.has(field);
}

export async function validateClientConfiguration(
  prisma: PrismaService,
  escritorioId: string,
  data: ClientData,
  rejectUnknown = false,
): Promise<void> {
  const [requiredFields, extraFields] = await Promise.all([
    prisma.client.campoObrigatorio?.findMany({
      where: { escritorioId, entidade: 'CLIENTE', obrigatorio: true },
    }) ?? [],
    prisma.client.campoExtra?.findMany({
      where: { escritorioId, entidade: 'CLIENTE', ativo: true },
    }) ?? [],
  ]);
  const issues: z.ZodIssue[] = [];

  for (const field of requiredFields) {
    if (!isRelevant(field.campo, data.tipo)) continue;
    if (!isFilled(data[field.campo as keyof ClientData])) {
      issues.push({
        code: 'custom',
        path: [field.campo],
        message: 'Campo obrigatório para este escritório.',
      });
    }
  }

  const values = { ...(data.camposExtrasValores ?? {}) };
  for (const field of extraFields) {
    if (!isFilled(values[field.id]) && field.valorPadrao) values[field.id] = field.valorPadrao;
  }
  data.camposExtrasValores = values;
  const allowedIds = new Set(extraFields.map((field) => field.id));
  for (const id of Object.keys(values)) {
    if (rejectUnknown && !allowedIds.has(id)) {
      issues.push({
        code: 'custom',
        path: ['camposExtrasValores', id],
        message: 'Campo extra não pertence a Clientes ou está inativo.',
      });
    }
  }
  for (const field of extraFields) {
    const value = values[field.id];
    if (field.obrigatorio && !isFilled(value)) {
      issues.push({
        code: 'custom',
        path: ['camposExtrasValores', field.id],
        message: `${field.nome} é obrigatório.`,
      });
      continue;
    }
    if (!isFilled(value)) continue;
    const text = String(value);
    const invalid =
      (field.tipo === 'NUMERO' && !Number.isFinite(Number(text))) ||
      (field.tipo === 'DATA' && Number.isNaN(Date.parse(text))) ||
      (field.tipo === 'BOOLEANO' && !['true', 'false'].includes(text)) ||
      (field.tipo === 'SELECT' && !field.opcoes.includes(text)) ||
      (field.tipo === 'MULTISELECT' &&
        text.split(',').some((option) => !field.opcoes.includes(option.trim())));
    if (invalid) {
      issues.push({
        code: 'custom',
        path: ['camposExtrasValores', field.id],
        message: `Valor inválido para ${field.nome}.`,
      });
    }
  }

  if (issues.length) throw new z.ZodError(issues);
}
