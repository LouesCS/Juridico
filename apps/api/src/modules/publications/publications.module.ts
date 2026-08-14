import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { PublicationsService } from './application/publications.service';
import { PublicationsController } from './presentation/publications.controller';
@Module({
  imports: [TimelineModule],
  controllers: [PublicationsController],
  providers: [PublicationsService],
})
export class PublicationsModule {}
