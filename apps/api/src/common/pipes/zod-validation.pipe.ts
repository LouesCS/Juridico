import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Reafirma docs/api/19-openapi.md §19.8 — Zod é a fonte única de validação,
 * tipo e schema OpenAPI. Nenhum DTO desta API é uma `class` anotada
 * manualmente com @ApiProperty quando já existe schema Zod equivalente.
 * Erros de validação são deixados propagar como ZodError, capturados pelo
 * AllExceptionsFilter e mapeados a 422 com fieldErrors.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    return this.schema.parse(value);
  }
}
