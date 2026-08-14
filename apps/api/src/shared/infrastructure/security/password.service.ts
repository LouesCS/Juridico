import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id — reafirma docs/05-arquitetura-backend.md §5.5 e
 * docs/database/02-convencoes-dados.md (parâmetros: memoryCost 19 MiB,
 * timeCost 2, parallelism 1).
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  };

  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, this.options);
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
