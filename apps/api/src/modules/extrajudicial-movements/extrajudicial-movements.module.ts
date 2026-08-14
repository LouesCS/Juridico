import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { ExtrajudicialMovementsService } from './application/extrajudicial-movements.service';
import { ExtrajudicialMovementsController } from './presentation/extrajudicial-movements.controller';
@Module({
  imports: [TimelineModule],
  controllers: [ExtrajudicialMovementsController],
  providers: [ExtrajudicialMovementsService],
})
export class ExtrajudicialMovementsModule {}
