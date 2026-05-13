import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Complaint } from '../complaints/entities/complaint.entity';
import { Reaction } from './entities/reaction.entity';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reaction, Complaint])],
  controllers: [ReactionsController],
  providers: [ReactionsService],
})
export class ReactionsModule {}
