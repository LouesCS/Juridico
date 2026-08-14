import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { JudicialMovementsService } from './application/judicial-movements.service';
import { JudicialMovementsController } from './presentation/judicial-movements.controller';

@Module({
  imports: [TimelineModule],
  controllers: [JudicialMovementsController],
  providers: [JudicialMovementsService],
})
export class JudicialMovementsModule {}
