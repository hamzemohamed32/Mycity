import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistrictsModule } from '../districts/districts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Complaint } from './entities/complaint.entity';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Complaint]),
    DistrictsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService, TypeOrmModule],
})
export class ComplaintsModule {}

