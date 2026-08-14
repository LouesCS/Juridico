import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { normalizeCnj } from '../../legal-cases/domain/cnj';
import {
  CapturedProcess,
  JudicialCaptureProvider,
  JudicialProviderError,
} from '../domain/judicial-capture-provider';

type DataJudMovement = {
  codigo?: number;
  nome?: string;
  dataHora?: string;
  orgaoJulgador?: { nomeOrgao?: string };
};
type DataJudSource = {
  id?: string;
  numeroProcesso?: string;
  tribunal?: string;
  classe?: { nome?: string };
  orgaoJulgador?: { nome?: string };
  movimentos?: DataJudMovement[];
};

/** Resolve o alias oficial a partir dos campos J.TR do CNJ. */
export function resolveDataJudAlias(cnj: string): string | null {
  const digits = normalizeCnj(cnj);
  if (digits.length !== 20) return null;
  const segment = digits[13];
  const tribunal = Number(digits.slice(14, 16));
  if (segment === '4' && tribunal >= 1 && tribunal <= 6) return `trf${tribunal}`;
  if (segment === '5' && tribunal >= 1 && tribunal <= 24) return `trt${tribunal}`;
  if (segment === '6') return tribunal === 90 ? 'tse' : null;
  if (segment === '8') {
    const stateAliases: Record<number, string> = {
      1: 'tjac',
      2: 'tjal',
      3: 'tjap',
      4: 'tjam',
      5: 'tjba',
      6: 'tjce',
      7: 'tjdft',
      8: 'tjes',
      9: 'tjgo',
      10: 'tjma',
      11: 'tjmt',
      12: 'tjms',
      13: 'tjmg',
      14: 'tjpa',
      15: 'tjpb',
      16: 'tjpr',
      17: 'tjpe',
      18: 'tjpi',
      19: 'tjrj',
      20: 'tjrn',
      21: 'tjrs',
      22: 'tjro',
      23: 'tjrr',
      24: 'tjsc',
      25: 'tjse',
      26: 'tjsp',
      27: 'tjto',
    };
    return stateAliases[tribunal] ?? null;
  }
  if (segment === '3')
    return (
      ({ 1: 'stf', 2: 'stj', 3: 'tst', 4: 'tse', 5: 'stm' } as Record<number, string>)[tribunal] ??
      null
    );
  return null;
}

@Injectable()
export class DataJudProvider implements JudicialCaptureProvider {
  readonly name = 'DATAJUD' as const;
  readonly capabilities = ['PROCESS', 'MOVEMENTS'] as const;

  constructor(private readonly config: ConfigService) {}

  async findProcess(cnj: string): Promise<CapturedProcess | null> {
    const alias = resolveDataJudAlias(cnj);
    if (!alias) return null;
    const apiKey = this.config.get<string>('DATAJUD_API_KEY') ?? '';
    if (!apiKey) throw new JudicialProviderError('UNAVAILABLE', 'DataJud não configurado.');
    const baseUrl = this.config.get<string>('DATAJUD_BASE_URL')!;
    const timeout = this.config.get<number>('JUDICIAL_CAPTURE_TIMEOUT_MS') ?? 15000;
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api_publica_${alias}/_search`, {
        method: 'POST',
        headers: { Authorization: `APIKey ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: normalizeCnj(cnj) } } }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError')
        throw new JudicialProviderError('TIMEOUT', 'Tempo limite excedido.');
      throw new JudicialProviderError('UNAVAILABLE', 'Fonte judicial indisponível.');
    }
    if (response.status === 429)
      throw new JudicialProviderError('RATE_LIMIT', 'Limite de consultas atingido.');
    if (!response.ok)
      throw new JudicialProviderError('UNAVAILABLE', `DataJud HTTP ${response.status}.`);
    const payload = (await response.json()) as {
      hits?: { hits?: Array<{ _id?: string; _source?: DataJudSource }> };
    };
    const hit = payload.hits?.hits?.[0];
    if (!hit?._source) return null;
    const source = hit._source;
    const normalizedCnj = normalizeCnj(source.numeroProcesso ?? cnj);
    const movements = (source.movimentos ?? []).flatMap((movement, index) => {
      if (!movement.dataHora || !movement.nome) return [];
      const externalId = createHash('sha256')
        .update(
          `${hit._id ?? source.id}|${movement.codigo ?? ''}|${movement.dataHora}|${movement.nome}|${index}`,
        )
        .digest('hex');
      return [
        {
          provider: this.name,
          externalId,
          cnj: normalizedCnj,
          date: new Date(movement.dataHora),
          type: String(movement.codigo ?? movement.nome),
          description: movement.nome,
          court: source.tribunal,
          rawReference: movement as Record<string, unknown>,
        },
      ];
    });
    return {
      provider: this.name,
      externalId: hit._id ?? source.id ?? normalizedCnj,
      cnj: normalizedCnj,
      court: source.tribunal,
      judgingBody: source.orgaoJulgador?.nome,
      proceduralClass: source.classe?.nome,
      lastMovementAt: movements.map((m) => m.date).sort((a, b) => b.getTime() - a.getTime())[0],
      movements,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.config.get<string>('DATAJUD_API_KEY'));
  }
}
