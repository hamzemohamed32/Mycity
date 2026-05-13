import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Complaint } from '../../complaints/entities/complaint.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'comments' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 1000 })
  body!: string;

  @ManyToOne(() => Complaint, (complaint) => complaint.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaintId' })
  complaint!: Complaint;

  @Column({ type: 'uuid' })
  complaintId!: string;

  @ManyToOne(() => User, (user) => user.comments, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column({ type: 'uuid' })
  authorId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
