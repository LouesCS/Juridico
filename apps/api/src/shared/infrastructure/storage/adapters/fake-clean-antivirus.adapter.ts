import { Injectable } from '@nestjs/common';
import { AntivirusPort, AntivirusScanResult } from '../antivirus.port';

@Injectable()
export class FakeCleanAntivirusAdapter implements AntivirusPort {
  async scan(_storageKey: string): Promise<AntivirusScanResult> {
    return 'LIMPO';
  }
}
