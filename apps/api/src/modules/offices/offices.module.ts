import { Module } from '@nestjs/common';
import { DeleteOfficeUseCase } from './application/use-cases/delete-office.use-case';
import { GetOfficeUseCase } from './application/use-cases/get-office.use-case';
import { UpdateOfficeUseCase } from './application/use-cases/update-office.use-case';
import { OfficesController } from './presentation/offices.controller';

@Module({
  controllers: [OfficesController],
  providers: [GetOfficeUseCase, UpdateOfficeUseCase, DeleteOfficeUseCase],
})
export class OfficesModule {}
