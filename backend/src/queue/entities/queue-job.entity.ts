import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum QueueJobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

@Entity({ name: 'queue_jobs' })
export class QueueJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 120 })
  type!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true, length: 200 })
  dedupeKey!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Index()
  @Column({
    type: 'enum',
    enum: QueueJobStatus,
    default: QueueJobStatus.Pending,
  })
  status!: QueueJobStatus;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ default: 5 })
  maxAttempts!: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  runAfter!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
