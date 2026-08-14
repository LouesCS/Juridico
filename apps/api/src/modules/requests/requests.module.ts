import { Module } from '@nestjs/common';
import { RequestsService } from './application/requests.service';
import { RequestsController } from './presentation/requests.controller';
@Module({controllers:[RequestsController],providers:[RequestsService],exports:[RequestsService]})
export class RequestsModule {}
