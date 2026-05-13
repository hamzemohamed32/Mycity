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

@Entity({ name: 'reactions' })
@Index(['complaintId', 'userId'], { unique: true })
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 'support' })
  type!: string;

  @ManyToOne(() => Complaint, (complaint) => complaint.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaintId' })
  complaint!: Complaint;

  @Column({ type: 'uuid' })
  complaintId!: string;

  @ManyToOne(() => User, (user) => user.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
