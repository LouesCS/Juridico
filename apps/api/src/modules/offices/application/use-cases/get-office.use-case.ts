import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class GetOfficeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    const escritorio = await this.prisma.client.escritorio.findFirst({
      where: { id: escritorioId },
    });
    if (!escritorio) throw new NotFoundException();
    return escritorio;
  }
}
