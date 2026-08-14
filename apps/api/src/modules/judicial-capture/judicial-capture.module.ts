import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { JudicialCaptureService } from './application/judicial-capture.service';
import { DataJudProvider } from './infrastructure/datajud.provider';
import { DjenProvider } from './infrastructure/djen.provider';
import { JudicialCaptureController } from './presentation/judicial-capture.controller';

@Module({
  imports: [TimelineModule],
  controllers: [JudicialCaptureController],
  providers: [JudicialCaptureService, DataJudProvider, DjenProvider],
  exports: [JudicialCaptureService],
})
export class JudicialCaptureModule {}
