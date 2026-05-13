import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { DistrictsModule } from './districts/districts.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueueModule } from './queue/queue.module';
import { ReactionsModule } from './reactions/reactions.module';
import { RedisModule } from './redis/redis.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { getEnvFileCandidates } from './config/env-paths';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFileCandidates(),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    RedisModule,
    QueueModule,
    AuthModule,
    UsersModule,
    DistrictsModule,
    ComplaintsModule,
    CommentsModule,
    ReactionsModule,
    NotificationsModule,
    UploadsModule,
    HealthModule,
  ],
})
export class AppModule {}
