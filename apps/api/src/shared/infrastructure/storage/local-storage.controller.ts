import {
  Controller,
  Get,
  GoneException,
  NotFoundException,
  Param,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import type { Request, Response } from 'express';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { Public } from '../../../common/decorators/public.decorator';
import { LocalStorageAdapter } from './adapters/local.adapter';

/**
 * Rotas `@Public()` — a autorização vem da posse do token HMAC de curta
 * duração embutido na URL (mesmo modelo de segurança de uma URL pré-assinada
 * de S3 real), nunca do `JwtAuthGuard`/`PermissionGuard` globais. Existe
 * apenas quando `STORAGE_PROVIDER=local` (dev/test) — reafirma
 * docs/backend/07-storage.md §7.3. Excluído do Swagger (não é um endpoint de
 * produto, é o "storage" simulado).
 */
@ApiExcludeController()
@Controller('storage/local')
export class LocalStorageController {
  constructor(private readonly storage: LocalStorageAdapter) {}

  @Public()
  @Put('upload/:token')
  async upload(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
    const payload = this.storage.tokens.verify(token);
    if (!payload || payload.action !== 'upload') {
      throw new GoneException('URL de upload expirada ou inválida.');
    }

    await this.storage.ensureDirFor(payload.key);
    const destination = this.storage.resolvedPath(payload.key);
    await pipeline(req, createWriteStream(destination));
    res.status(201).json({ ok: true });
  }

  @Public()
  @Get('download/:token')
  async download(@Param('token') token: string, @Res() res: Response) {
    const payload = this.storage.tokens.verify(token);
    if (!payload || payload.action !== 'download') {
      throw new GoneException('URL de download expirada ou inválida.');
    }

    const path = this.storage.resolvedPath(payload.key);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException('Arquivo não encontrado no storage local.');
    }

    const fileName = payload.fileName ?? payload.key.split('/').pop() ?? 'arquivo';
    res.setHeader(
      'Content-Disposition',
      `${payload.disposition ?? 'attachment'}; filename="${encodeURIComponent(fileName)}"`,
    );
    await pipeline(createReadStream(path), res);
  }
}
