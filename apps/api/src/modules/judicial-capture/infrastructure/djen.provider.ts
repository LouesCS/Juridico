import { Injectable } from '@nestjs/common';
import { CapturedProcess, JudicialCaptureProvider } from '../domain/judicial-capture-provider';

/** Porta preparada: a API oficial pública não possui contrato estável validado nesta Sprint. */
@Injectable()
export class DjenProvider implements JudicialCaptureProvider {
  readonly name = 'DJEN' as const;
  readonly capabilities = ['COMMUNICATIONS'] as const;
  async findProcess(_cnj: string): Promise<CapturedProcess | null> {
    return null;
  }
  async healthCheck(): Promise<boolean> {
    return false;
  }
}
