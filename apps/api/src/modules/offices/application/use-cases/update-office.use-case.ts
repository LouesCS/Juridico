import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { UpdateOfficeDto } from '../../presentation/schemas/office.schemas';

@Injectable()
export class UpdateOfficeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, input: UpdateOfficeDto) {
    // `slug` não é alterável por este endpoint — reafirma docs/api/05-offices.md §5.2.
    return this.prisma.client.escritorio.update({
      where: { id: escritorioId },
      data: input,
    });
  }
}
