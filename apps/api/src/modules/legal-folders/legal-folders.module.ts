import { Module } from '@nestjs/common';
import { LegalFoldersService } from './application/legal-folders.service';
import { LegalFoldersController } from './presentation/legal-folders.controller';

@Module({
  controllers: [LegalFoldersController],
  providers: [LegalFoldersService],
  exports: [LegalFoldersService],
})
export class LegalFoldersModule {}
