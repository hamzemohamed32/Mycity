import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Complaint } from '../../complaints/entities/complaint.entity';
import { User } from '../../users/entities/user.entity';

export enum NotificationDeliveryStatus {
  Pending = 'pending',
  Delivered = 'delivered',
  Failed = 'failed',
  NoDevices = 'no_devices',
}

@Entity({ name: 'notification_events' })
export class NotificationEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  complaintId!: string | null;

  @ManyToOne(() => Complaint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'complaintId' })
  complaint!: Complaint | null;

  @Column({ length: 120 })
  title!: string;

  @Column({ length: 500 })
  body!: string;

  @Column({ length: 60, default: 'general' })
  type!: string;

  @Column({ default: false })
  isRead!: boolean;

  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.Pending,
  })
  deliveryStatus!: NotificationDeliveryStatus;

  @Column({ default: 0 })
  deliveryAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  lastDeliveryError!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
