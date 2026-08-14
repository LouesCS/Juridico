export interface CapturedJudicialMovement {
  provider: 'DATAJUD' | 'DJEN';
  externalId: string;
  cnj: string;
  date: Date;
  type: string;
  description: string;
  court?: string;
  rawReference?: Record<string, unknown>;
}

export interface CapturedProcess {
  provider: 'DATAJUD' | 'DJEN';
  externalId: string;
  cnj: string;
  court?: string;
  judgingBody?: string;
  proceduralClass?: string;
  lastMovementAt?: Date;
  movements: CapturedJudicialMovement[];
}

export interface JudicialCaptureProvider {
  readonly name: 'DATAJUD' | 'DJEN';
  readonly capabilities: ReadonlyArray<'PROCESS' | 'MOVEMENTS' | 'COMMUNICATIONS'>;
  findProcess(cnj: string): Promise<CapturedProcess | null>;
  healthCheck(): Promise<boolean>;
}

export class JudicialProviderError extends Error {
  constructor(
    public readonly code: 'TIMEOUT' | 'RATE_LIMIT' | 'UNAVAILABLE' | 'INVALID_RESPONSE',
    message: string,
  ) {
    super(message);
  }
}
