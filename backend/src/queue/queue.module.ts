import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../redis/redis.module';
import { QueueJob } from './entities/queue-job.entity';
import { QueueService } from './queue.service';

@Module({
  imports: [TypeOrmModule.forFeature([QueueJob]), RedisModule],
  providers: [QueueService],
  exports: [QueueService, TypeOrmModule],
})
export class QueueModule {}
