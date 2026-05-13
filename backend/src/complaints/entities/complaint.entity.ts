import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Comment } from '../../comments/entities/comment.entity';
import { District } from '../../districts/entities/district.entity';
import { User } from '../../users/entities/user.entity';
import { GeoPoint } from '../../common/types/geo-point.type';
import { Reaction } from '../../reactions/entities/reaction.entity';

export enum ComplaintCategory {
  Waste = 'waste',
  Water = 'water',
  Roads = 'roads',
  Lighting = 'lighting',
  Drainage = 'drainage',
  Other = 'other',
}

export enum ComplaintStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Resolved = 'resolved',
}

@Entity({ name: 'complaints' })
@Index(['createdById', 'clientRequestId'], { unique: true })
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 2000 })
  description!: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 120 })
  clientRequestId!: string | null;

  @Column({
    type: 'enum',
    enum: ComplaintCategory,
  })
  category!: ComplaintCategory;

  @Index()
  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.Pending,
  })
  status!: ComplaintStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  districtId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  assignedAdminId!: string | null;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location!: GeoPoint;

  @Column({ default: 0 })
  supportCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => User, (user) => user.complaints, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => District, (district) => district.complaints, { nullable: true, eager: true })
  @JoinColumn({ name: 'districtId' })
  district!: District | null;

  @OneToMany(() => Comment, (comment) => comment.complaint)
  comments!: Comment[];

  @OneToMany(() => Reaction, (reaction) => reaction.complaint)
  reactions!: Reaction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
